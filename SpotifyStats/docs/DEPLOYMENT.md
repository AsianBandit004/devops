# Deployment

The files in this repository are public-safe examples. Adapt account names, paths, domains, certificate handling, and Jenkins credential identifiers through protected configuration.

## Validation gate

```bash
npm ci
npm run lint
npm run test
npx playwright install chromium
npm run test:e2e
npm run build
```

Only a successful build should be promoted.

## Example host layout

```text
/opt/skyrider                 application files
/etc/skyrider/skyrider.env   protected environment file
/var/lib/skyrider            SQLite data
```

Create a dedicated unprivileged `skyrider` service account. The environment file should be readable only by root and the service group; the data directory should be writable only by the service account.

## systemd and Apache

Install the examples from `ops/systemd/` under `/etc/systemd/system/`, then reload systemd and enable the application service and timers. Adapt `ops/apache/skyrider.conf.example`, connect it to the host's existing TLS certificate management, validate the configuration, and reload Apache. Never place credentials inside these files.

## Jenkins

`Jenkinsfile.example` validates on the Jenkins agent, deploys only selected artifacts, restarts the systemd service, and checks the loopback health endpoint. The deployment identity should have only the narrowly scoped privilege needed to restart `skyrider.service`.

Do not give the deployment user unrestricted passwordless `rsync`, shell, or systemctl privileges.
