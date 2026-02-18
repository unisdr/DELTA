# Weblate Guide For Translators

We use Weblate to review and correct auto-translated strings. As the application evolves, new strings are added and require human review.

To track which strings have been reviewed per language, we use language-specific labels in Weblate.

Note: Weblate applies labels to all translations of a string. Since we need to track review status per language, we use the format: checked-{language-code}

How to Use Labels
After reviewing and finalizing a translation:

- Click Edit next to Labels on the right side of the screen (under String information). <img width="573" height="496" alt="image" src="https://github.com/user-attachments/assets/b31c812b-41b5-4475-ac2a-027da207849e" />

- Add check to the label checked-{lang} <img width="734" height="579" alt="image" src="https://github.com/user-attachments/assets/df9cabcb-11dc-44cb-95c9-439b874e73c5" />
- Save.

If the label doesn’t exist yet, you can create it in "Project Settings".

Find Unreviewed Strings

Example links to find strings that need review. You can use similar filter for any langauges.

- [Component: App/UI](https://tools.undrr.org/weblate/translate/delta-resilience/delta-app/ru/?q=NOT+label%3Achecked-ru)
- [Component: Content](https://tools.undrr.org/weblate/translate/delta-resilience/delta-content/ru/?q=NOT+label%3Achecked-ru)
- [Example of a Reviewed String](http://tools.undrr.org/weblate/translate/delta-resilience/delta-app/ru/?checksum=48c4d7defdd9d7ef)
