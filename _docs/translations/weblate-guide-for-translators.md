# Weblate Guide For Translators

We use Weblate to review and correct auto-translated strings. As the application evolves, new strings are added and require human review.

To track which strings have been reviewed per language, we use language-specific labels in Weblate.

Note: Weblate applies labels to all translations of a string. Since we need to track review status per language, we use the format: checked-{language-code}

How to Use Labels
After reviewing and finalizing a translation:
- Click Edit next to Labels on the right side of the screen (under String information).
- Add check to the label checked-{lang}
- Save.

If the label doesn’t exist yet, you can create it in "Project Settings".

Find Unreviewed Strings

Example links to find strings that need review. You can use similar filter for any langauges.

- [Component: App/UI](https://tools.undrr.org/weblate/translate/delta-resilience/delta-app/ru/?q=NOT+label%3Achecked-ru)
- [Component: Content](https://tools.undrr.org/weblate/translate/delta-resilience/delta-content/ru/?q=NOT+label%3Achecked-ru)
- [Example of a Reviewed String](http://tools.undrr.org/weblate/translate/delta-resilience/delta-app/ru/?checksum=48c4d7defdd9d7ef)
