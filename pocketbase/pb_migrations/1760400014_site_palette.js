/// <reference path="../pb_data/types.d.ts" />

/**
 * The site's colour palette (Site settings → Colours): `site_content.palette`,
 * a JSON object of "#rrggbb" colours by name (see src/theme/palette.ts). Empty
 * means the colours the site was made with. Public like the rest of the
 * content; pb_hooks/site.pb.js checks it on every save.
 */
migrate(
  (app) => {
    const content = app.findCollectionByNameOrId('site_content');
    content.fields.add(new JSONField({ name: 'palette', maxSize: 2000 }));
    app.save(content);
  },
  (app) => {
    const content = app.findCollectionByNameOrId('site_content');
    content.fields.removeByName('palette');
    app.save(content);
  },
);
