import { useId, useState, type ChangeEvent } from 'react';
import formStyles from '../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../i18n';
import { PhotoCheckError, preparePhoto } from '../../../../lib/preparePhoto';
import { toAdminError } from '../../../../services/admin';
import {
  AREA_SLOTS,
  PHOTO_SECTIONS,
  sectionSlot,
  type PhotoSection,
  type PhotoSlot,
  type SiteContent,
  type SiteRepository,
} from '../../../../services/site';
import { siteSettingsMessages } from '../../messages/siteSettings';
import styles from './site.module.css';

type Messages = (typeof siteSettingsMessages)['en'];

/** The slots of each group, with the name shown under their photo. */
function groups(t: Messages): { key: PhotoSection | 'hero' | 'area'; slots: { slot: PhotoSlot; name: string }[] }[] {
  const sides = (section: PhotoSection) =>
    (['left', 'right'] as const).flatMap((side) =>
      ([1, 2] as const).map((position) => ({ slot: sectionSlot(section, side, position), name: t.photos.slot(side, position) })),
    );
  return [
    { key: 'hero', slots: [{ slot: 'hero', name: t.photos.groups.hero }] },
    ...PHOTO_SECTIONS.map((section) => ({ key: section, slots: sides(section) })),
    { key: 'area', slots: AREA_SLOTS.map((slot, index) => ({ slot, name: t.photos.areaSlot(index + 1) })) },
  ];
}

interface PhotosEditorProps {
  content: SiteContent;
  repository: SiteRepository;
  /** Called with the content after every change. */
  onChange: (content: SiteContent) => void;
}

/** Every photo of the site: replace it, describe it, or go back to the default picture. */
export function PhotosEditor({ content, repository, onChange }: PhotosEditorProps) {
  const t = useMessages(siteSettingsMessages);

  return (
    <section className={styles.section} aria-labelledby="site-photos-title">
      <h3 id="site-photos-title" className={styles.sectionTitle}>
        {t.photos.legend}
      </h3>
      <p className={formStyles.hint}>{t.photos.intro}</p>
      {groups(t).map((group) => (
        <div key={group.key} className={styles.photoGroup}>
          <h4 className={styles.groupTitle}>{t.photos.groups[group.key]}</h4>
          <ul className={`${styles.photoGrid} ${group.key === 'hero' ? styles.heroGrid : ''}`}>
            {group.slots.map(({ slot, name }) => (
              <li key={slot}>
                <PhotoSlotEditor
                  slot={slot}
                  name={group.key === 'hero' ? name : `${t.photos.groups[group.key]} · ${name}`}
                  shortName={name}
                  content={content}
                  repository={repository}
                  onChange={onChange}
                  decorative={group.key === 'area'}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

interface PhotoSlotEditorProps extends PhotosEditorProps {
  slot: PhotoSlot;
  /** Full name, for screen readers ("Around “Location” · Left 1"). */
  name: string;
  shortName: string;
  /** The private area photos are decoration: no description. */
  decorative: boolean;
}

function PhotoSlotEditor({ slot, name, shortName, content, repository, onChange, decorative }: PhotoSlotEditorProps) {
  const t = useMessages(siteSettingsMessages).photos;
  const uid = useId();
  const photo = content.photos[slot];
  const uploaded = content.uploaded.includes(slot);
  const [alt, setAlt] = useState(photo.alt);
  const [busy, setBusy] = useState<'upload' | 'alt' | 'reset' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: 'upload' | 'alt' | 'reset', perform: () => Promise<SiteContent>) => {
    setBusy(action);
    setError(null);
    try {
      const updated = await perform();
      onChange(updated);
      setAlt(updated.photos[slot].alt);
      setConfirming(false);
    } catch (reason) {
      setError(reason instanceof PhotoCheckError ? reason.message : toAdminError(reason).message);
    } finally {
      setBusy(null);
    }
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // choosing the same file again still triggers a change
    if (!file) return;
    // The main photo is shown full screen: keep it larger.
    void run('upload', async () =>
      // A new photo starts without the default picture's description: write its own.
      repository.uploadPhoto(slot, await preparePhoto(file, slot === 'hero' ? 2400 : 1600), uploaded ? alt.trim() : ''),
    );
  };

  return (
    <article className={styles.photoCard} aria-label={name}>
      <img className={styles.photoPreview} src={photo.src} alt={t.previewAlt(name)} loading="lazy" />
      <p className={styles.photoName}>
        {shortName} <span className={uploaded ? styles.custom : styles.muted}>· {uploaded ? t.custom : t.default}</span>
      </p>

      <input
        id={`${uid}-file`}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        onChange={choose}
        disabled={busy !== null}
      />
      <label htmlFor={`${uid}-file`} className={`${formStyles.secondary} ${styles.smallButton}`} aria-label={`${t.change}: ${name}`}>
        {busy === 'upload' ? t.uploading : t.change}
      </label>

      {decorative ? (
        <p className={styles.muted}>{t.altDecorative}</p>
      ) : (
        uploaded && (
          <div className={styles.altRow}>
            <label htmlFor={`${uid}-alt`}>{t.alt}</label>
            <input
              id={`${uid}-alt`}
              value={alt}
              maxLength={200}
              onChange={(event) => {
                setAlt(event.target.value);
                setError(null);
              }}
            />
            <button
              type="button"
              className={formStyles.textButton}
              disabled={busy !== null || alt.trim() === photo.alt}
              onClick={() => void run('alt', () => repository.updatePhotoAlt(slot, alt.trim()))}
            >
              {t.saveAlt}
            </button>
          </div>
        )
      )}

      {uploaded &&
        (confirming ? (
          <button
            type="button"
            className={`${formStyles.textButton} ${styles.danger}`}
            disabled={busy !== null}
            onClick={() => void run('reset', () => repository.resetPhoto(slot))}
          >
            {t.confirmReset}
          </button>
        ) : (
          <button
            type="button"
            className={formStyles.textButton}
            disabled={busy !== null}
            onClick={() => setConfirming(true)}
          >
            {t.reset}
          </button>
        ))}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </article>
  );
}
