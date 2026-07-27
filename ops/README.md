# MCQ production operations

These files harden the existing VPS deployment at `/var/www/handyant`. They do
not contain credentials and are not activated merely by deploying application
source.

Run the repository-side safety tests with:

```bash
ops/test.sh
```

Before the first deployment that contains the new Prisma baseline, follow the
one-time existing-database procedure in
[DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md). A fresh database should run
the full migration chain normally.

## Safety properties

- A backup contains a PostgreSQL custom dump, `storage/uploads`, release
  metadata, and SHA-256 checksums.
- The backup is built in a private partial directory and atomically renamed.
- `OFFSITE_TARGET` is mandatory.
- Local pruning happens only after `rclone copy` and `rclone check` succeed.
- Pruning is limited to timestamp-named backup directories.
- Weekly verification restores the newest dump into a disposable database.
- The HTTPS monitor checks both HTTP 200 and expected MCQ page content.
- No secret belongs in this repository. `/etc/mcq-ops.env` must be root-owned
  mode `0600`, and rclone credentials belong in its protected config.

## Dependencies

The VPS needs `curl`, `jq`, `postgresql-client`, `rclone`, `tar`, and
`util-linux` (`flock` and `runuser`), plus PM2 and a Node.js version supported
by the application (`20.19+`, `22.12+`, or `24+`). Configure an encrypted
off-host rclone remote backed by S3, B2, SFTP, or another independent provider.
The `pg_dump` client must be compatible with the production PostgreSQL server
(normally the same major version or newer); prove compatibility with the real
backup and disposable restore drill rather than relying on package presence.

## Installation

Run from a checked-out copy of this repository. Review every command and the
populated config before enabling timers.

```bash
sudo install -d -m 0750 /opt/mcq-ops/bin
sudo install -m 0750 ops/bin/*.sh /opt/mcq-ops/bin/

sudo install -m 0600 ops/mcq-ops.env.example /etc/mcq-ops.env
sudoedit /etc/mcq-ops.env

sudo rclone config
sudo /opt/mcq-ops/bin/backup-mcq.sh --config /etc/mcq-ops.env --check-config
sudo /opt/mcq-ops/bin/backup-mcq.sh --config /etc/mcq-ops.env --dry-run
```

Before scheduling anything, make one real backup and run a disposable restore:

```bash
sudo /opt/mcq-ops/bin/backup-mcq.sh --config /etc/mcq-ops.env
sudo /opt/mcq-ops/bin/verify-latest-backup.sh --config /etc/mcq-ops.env
```

The disposable restore command restores the PostgreSQL dump into a temporary
database and drops it afterward. It verifies the upload archive structurally,
but it does not overwrite production uploads. Complete the non-destructive
upload half of the drill by extracting one timestamped archive to a dedicated
temporary directory and confirming that its `uploads` tree is readable:

```bash
sudo install -d -m 0700 /var/tmp/mcq-upload-restore
sudo tar -xzf /var/backups/mcq/YYYYMMDDTHHMMSSZ/uploads.tar.gz \
  -C /var/tmp/mcq-upload-restore --no-same-owner --no-same-permissions
sudo test -d /var/tmp/mcq-upload-restore/uploads
sudo find /var/tmp/mcq-upload-restore/uploads -type f -print | head
```

Remove the temporary drill directory after inspection. Before relying on these
backups, confirm that `POSTGRES_DB` in `/etc/mcq-ops.env` names the same local
database used by the application's `DATABASE_URL`. The provided backup script
assumes a PostgreSQL instance accessible through the local `postgres` operating
system account; adapt and re-test it before use if production PostgreSQL is
remote.

Inspect both local and off-host copies:

```bash
sudo find /var/backups/mcq -maxdepth 2 -type f -printf '%TY-%Tm-%Td %TH:%TM %s %p\n'
sudo rclone lsl YOUR_REMOTE:YOUR_MCQ_PATH
```

Install the timers only after those commands pass:

```bash
sudo install -m 0644 ops/systemd/mcq-backup.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/mcq-backup.timer /etc/systemd/system/
sudo install -m 0644 ops/systemd/mcq-backup-verify.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/mcq-backup-verify.timer /etc/systemd/system/
sudo install -m 0644 ops/systemd/mcq-health.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/mcq-health.timer /etc/systemd/system/
sudo install -m 0644 ops/systemd/mcq-reminders.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/mcq-reminders.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mcq-backup.timer mcq-backup-verify.timer mcq-health.timer mcq-reminders.timer
systemctl list-timers 'mcq-*'
```

The reminder service reads the production app environment from
`/var/www/handyant/.env` and runs as `webapps`. `DATABASE_URL`,
`RESEND_API_KEY`, `NEXTAUTH_URL`, `EMAIL_FROM`, and `EMAIL_REPLY_TO` must be
present; `EMAIL_BCC` is required by MCQ's production mail policy. Before
enabling its timer, run one manual pass from the application working directory
and inspect the structured result:

```bash
sudo -u webapps -- sh -c \
  'cd /var/www/handyant && exec ./node_modules/.bin/tsx scripts/process-reminders.ts'
sudo systemctl status mcq-reminders.service mcq-reminders.timer
sudo journalctl -u mcq-reminders.service -n 50 --no-pager
```

The database delivery ledger and Resend idempotency key prevent overlapping
timer runs from sending the same booking/user/lead-time reminder twice. SMS and
push channels remain disabled until production providers are configured.
A zero-due manual pass proves database access but not delivery. Before release
closure, create a controlled reminder that is due within the processing window,
confirm `sent: 1` in the structured output, confirm receipt, and inspect the
Resend delivery log.

Use a dedicated, sending-only Resend key for health alerts. Production closure
requires either configuring `RESEND_API_KEY` and `ALERT_TO` in
`/etc/mcq-ops.env` or connecting systemd failures to another attended alerting
system. If alert fields are left empty, the monitor still exits nonzero and
records failures in the journal, but nobody is notified automatically.

## PM2 boot recovery

The live application must be supervised by the `webapps` PM2 daemon, not root's
separate PM2 home. First save and inspect the process list:

```bash
sudo -u webapps env PM2_HOME=/home/webapps/.pm2 pm2 save
sudo -u webapps env PM2_HOME=/home/webapps/.pm2 pm2 prettylist
```

Install the reviewed unit:

```bash
sudo install -m 0644 ops/systemd/pm2-webapps.service /etc/systemd/system/
sudo systemctl daemon-reload
```

Do not start the unit on top of a manually running PM2 daemon. Schedule a
maintenance window, then transfer supervision:

```bash
sudo -u webapps env PM2_HOME=/home/webapps/.pm2 pm2 save
sudo -u webapps env PM2_HOME=/home/webapps/.pm2 pm2 kill
sudo systemctl enable --now pm2-webapps.service
sudo /opt/mcq-ops/bin/validate-pm2-recovery.sh
```

Finally, perform a controlled VPS reboot and rerun
`validate-pm2-recovery.sh`. That reboot is the only conclusive recovery test.

## Disk and log retention

Always inventory before deleting:

```bash
df -hT /
sudo du -xhd1 /var/www /var/backups /var/log /root | sort -h
sudo journalctl --disk-usage
sudo find /var/www -maxdepth 1 -type d -name 'handyant.previous-*' -printf '%TY-%Tm-%Td %TH:%TM %p\n'
sudo find /var/backups/handyant -mindepth 1 -maxdepth 1 -printf '%TY-%Tm-%Td %TH:%TM %p\n'
sudo npm cache verify
```

The provided journal limit prevents logs from filling the disk:

```bash
sudo install -d -m 0755 /etc/systemd/journald.conf.d
sudo install -m 0644 ops/systemd/60-mcq-journal-retention.conf \
  /etc/systemd/journald.conf.d/60-mcq-journal-retention.conf
sudo systemctl restart systemd-journald
sudo journalctl --vacuum-size=500M
```

Install PM2 rotation:

```bash
sudo install -m 0644 ops/logrotate/mcq-pm2 /etc/logrotate.d/mcq-pm2
sudo logrotate --debug /etc/logrotate.d/mcq-pm2
```

Retain at least the current release, one known-good application rollback, seven
daily local backups, and thirty off-host backups. Remove older deployment
copies only after the current backup and disposable restore check pass. Cache
cleanup should use `npm cache verify` first; never remove active `.next`,
`node_modules`, `.env`, PostgreSQL data, or `storage/uploads`.

## Verification and troubleshooting

```bash
systemctl status mcq-backup.timer mcq-backup-verify.timer mcq-health.timer
journalctl -u mcq-reminders.service -n 100 --no-pager
journalctl -u mcq-backup.service -n 100 --no-pager
journalctl -u mcq-backup-verify.service -n 100 --no-pager
journalctl -u mcq-health.service -n 100 --no-pager
sudo -u webapps env PM2_HOME=/home/webapps/.pm2 pm2 jlist
curl -fsS https://mcqpropertycare.com/ | grep -F 'MCQ Property Care'
```

An integrity check is not the same as a restore check. Production closure
requires at least one successful disposable restore and one controlled reboot
test, with their logs retained.
