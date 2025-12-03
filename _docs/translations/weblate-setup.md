# Weblate setup instructions

Last done: 2025-12-03

## Prerequisites

- Access to http://tools.undrr.org/weblate
- Admin rights to DELTA Resilience project in weblate
- Commit rights to the weblate branch in git repo
- 
## Setup instructions


### Initial import

Select project

https://tools.undrr.org/weblate/projects/delta-resilience/

Press "Add new translation component"

Component name: DELTA

Source code repository:
https://github.com/unisdr/delta

Repository branch: weblate

On the next page it asks to choose translation files to import.
The autodetection for file format is wrong.
Select "Specify configuration manually".

Set the following fields:

```
File format
Format.JS JSON file
go-i18n v2 JSON file

File mask
app/locales/*.json
Monolingual base language file
app/locales/en.json
Edit base file
Uncheck
Translation license
Apache License 2.0
```

After it's completed
Return to the component

And check that english strings were imported properly.

### Setting up push to repo

Go to component > Settings

Version Control
Pepository push URL

This field requires access to the github repo.

See below on how to do that.

Source code repository:

The format with token will look like this:
https://username:token@github.com/unisdr/delta

Age of changes to commit
By the default commits every 24 hours, but could press commit sooner
This seems fine as default



### Setting up github access

#### via personal account

One way to set that up is to use github personal accesss tokens (classic).

Go to the following page
https://github.com/settings/tokens
Press Generate new token > classic

Give repo access and nothing else.

The format with token will look like this:
https://username:token@github.com/unisdr/delta

github non classic tokens won't work for this

since repo access only possible for repos you own

