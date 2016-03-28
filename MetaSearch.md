After installation:
- use a local html file btsearch.html containing the code <!DOCTYPE html>

To use a local file:
- In Firefox, open about:config and change greasemonkey.fileIsGreaseable to true.
- In Chrome, open Settings -> Extensions, and enable the option Allow access to file URLs for Tampermonkey.

###Hints###

- To clear the page, clear the search input twice.

- The script uses HTTPS everywhere possible. If a source reports a host error, click on its icon in the message and check, if there is no browser message about an invalid certificate preventing the page from loading.

- Movies support years in queries, tv shows support resolutions.

- Supports OpenSearch, you can add the search plugins to your FF. Local files aren't allowed, therefore they point to the Github host.

Open issues
- Cyrillic queries don't work on HDClub and BlueBird.
