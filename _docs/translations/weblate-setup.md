# Weblate setup instructions

Last done: 2025-12-26

## Prerequisites

- Access to http://tools.undrr.org/weblate
- Admin rights to DELTA Resilience project in weblate
- Commit rights to the weblate branch in git repo
-

## Setup instructions

We will be setting up two components. Repeat the below process for both of them. Only name and file locations differen between two.

### App/UI

Static interface text (e.g., buttons, labels, messages, emails).

```
Name: DELTA App/UI
URL slug: delta-app
File mask:
locales/app/*.json
Monolingual base language file:
locales/app/en.json
```

### Content (HIPs, Sectors, Assets)

Localized seeded content from the database.

```
Name: DELTA Content (HIPs, Sectors, Assets)
URL slug: delta-content
File mask:
locales/content/*.json
Monolingual base language file:
locales/content/en.json
```

### Initial import

Select project

https://tools.undrr.org/weblate/projects/delta-resilience/

Press "Add new translation component"

Component name: [SEE ABOVE]

Source code repository:
https://github.com/unisdr/delta

Repository branch: weblate

On the next page it asks to choose translation files to import.
The autodetection for file format is wrong.
Select "Specify configuration manually".

Set the following fields:

```
File format
go-i18n v1 JSON file
	(note v2 does not work in weblate even though it says supported with version 5.6)

File mask
locales/[SEE ABOVE]/*.json
Monolingual base language file
locales/[SEE ABOVE]/en.json
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

Use a **classic PAT** with `repo` scope — fine-grained PATs are not supported by Weblate's URL-embedded authentication method.
