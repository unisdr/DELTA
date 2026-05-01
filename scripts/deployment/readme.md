# Deployment Cron Configuration

This directory contains environment settings for the image refresh cron job.

## DEV server

### Files

- `.cron-refresh_dev_image.env`: environment variables consumed by `scripts/deployment/refresh_dev_image.sh`

### Current Variables

- `IMAGE=ghcr.io/unisdr/delta-country:dev-latest`
- `APP_SERVICE=app`
- `DB_SERVICE=db`
- `DB_NAME=dts_development`

### Cron Example

Use this crontab entry to load the env file and run every 15 minutes:

```cron
*/15 * * * * set -a; . /[FULL_PATH_PROJECT_FOLDER]/scripts/deployment/.cron-refresh_dev_image.env; set +a; /[FULL_PATH_PROJECT_FOLDER]/scripts/deployment/refresh_dev_image.sh >> /[FULL_PATH_PROJECT_FOLDER]/logs/refresh_dev_image.log 2>&1
```

To run every 5 minutes, replace `*/15` with `*/5`.


