'use client';

import { Zap } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react';
import { identity } from '@sitecore-cloudsdk/events/browser';
import { Text, type TextField, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';
import { cn } from '@/shadcn/lib/utils';

type IdentifierRow = {
  id: string;
  provider: string;
  expiryDate: string;
};

export type IdentityEventProps = ComponentProps & {
  params: { [key: string]: string };
  fields?: {
    Title?: TextField;
    SubmitLabel?: TextField;
  };
};

type IdentityPayload = Parameters<typeof identity>[0];

/**
 * Collects identity attributes supported by {@link https://doc.sitecore.com/sdk/en/developers/006/cloud-sdk/identity-events.html | Sitecore Cloud SDK identity events}
 * and sends an IDENTITY event via `identity()` from `@sitecore-cloudsdk/events/browser`.
 */
export default function IdentityEvent(props: IdentityEventProps): JSX.Element {
  const { styles, RenderingIdentifier: id } = props.params;
  const {
    page: { layout, mode },
  } = useSitecore();
  const route = layout?.sitecore?.route;

  const [isOpen, setIsOpen] = useState(false);
  const panelId = `identity-event-sidebar-${props.rendering.uid ?? 'default'}`;

  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([
    { id: '', provider: '', expiryDate: '' },
  ]);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [stateField, setStateField] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [streetLines, setStreetLines] = useState('');

  const [channel, setChannel] = useState('WEB');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('');
  const [pageName, setPageName] = useState('');

  const [extensionJson, setExtensionJson] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const isDevEnv = process.env.NODE_ENV === 'development';
  const eventsUnavailable = isDevEnv || !mode.isNormal;

  const defaultLanguageHint = route?.itemLanguage ?? '';

  const languagePlaceholder = useMemo(() => {
    return defaultLanguageHint ? `e.g. ${defaultLanguageHint}` : 'e.g. en';
  }, [defaultLanguageHint]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const updateIdentifier = (index: number, patch: Partial<IdentifierRow>) => {
    setIdentifiers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addIdentifierRow = () => {
    setIdentifiers((rows) => [...rows, { id: '', provider: '', expiryDate: '' }]);
  };

  const removeIdentifierRow = (index: number) => {
    setIdentifiers((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  const buildPayload = (): IdentityPayload | null => {
    const mappedIdentifiers = identifiers
      .map((row) => ({
        id: row.id.trim(),
        provider: row.provider.trim(),
        expiryDate: row.expiryDate.trim(),
      }))
      .filter((row) => row.id.length > 0 && row.provider.length > 0)
      .map((row) => ({
        id: row.id,
        provider: row.provider,
        ...(row.expiryDate.length > 0 ? { expiryDate: row.expiryDate } : {}),
      }));

    if (mappedIdentifiers.length === 0) {
      return null;
    }

    const payload: IdentityPayload = {
      identifiers: mappedIdentifiers,
    };

    const optional = (value: string) => (value.trim().length > 0 ? value.trim() : undefined);

    payload.email = optional(email);
    payload.firstName = optional(firstName);
    payload.lastName = optional(lastName);
    payload.phone = optional(phone);
    payload.mobile = optional(mobile);
    payload.dob = optional(dob);
    payload.gender = optional(gender);
    payload.title = optional(title);
    payload.city = optional(city);
    payload.country = optional(country);
    payload.state = optional(stateField);
    payload.postalCode = optional(postalCode);

    const street = streetLines
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (street.length > 0) {
      payload.street = street;
    }

    payload.channel = optional(channel);
    payload.currency = optional(currency);
    payload.language = optional(language);
    payload.page = optional(pageName);

    const extTrimmed = extensionJson.trim();
    if (extTrimmed.length > 0) {
      try {
        const parsed = JSON.parse(extTrimmed) as unknown;
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Extension data must be a JSON object.');
        }
        payload.extensionData = parsed as IdentityPayload['extensionData'];
      } catch (e) {
        throw e instanceof Error ? e : new Error('Invalid extension JSON.');
      }
    }

    return payload;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResultMessage(null);

    let payload: IdentityPayload | null = null;
    try {
      payload = buildPayload();
    } catch (e) {
      setStatus('error');
      setResultMessage(e instanceof Error ? e.message : 'Could not build identity payload.');
      return;
    }

    if (!payload) {
      setStatus('error');
      setResultMessage('Add at least one identifier with both Provider and Id.');
      return;
    }

    if (eventsUnavailable) {
      setStatus('error');
      setResultMessage(
        isDevEnv
          ? 'The Events SDK is not initialized in development in this starter (see Bootstrap). Run a production build to send events, or adjust Bootstrap for local testing.'
          : 'Identity events are only sent in normal browsing mode (not while editing or previewing).'
      );
      return;
    }

    setStatus('loading');
    try {
      const response = await identity(payload);
      setStatus('success');
      setResultMessage(
        response === null ? 'Event accepted (no response body).' : JSON.stringify(response, null, 2)
      );
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : String(err);
      setResultMessage(message);
    }
  };

  return (
    <section className={cn('component identity-event group', styles)} id={id || undefined}>
      <div className="pointer-events-none fixed inset-0 z-[100]">
        <button
          type="button"
          className={cn(
            'pointer-events-auto fixed right-3 z-[102] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full',
            'border-foreground/15 bg-background/95 text-accent border shadow-lg backdrop-blur-sm',
            'hover:bg-accent/10 focus-visible:ring-accent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            isOpen && 'ring-accent/40 ring-2'
          )}
          style={{ top: '33vh' }}
          aria-expanded={isOpen}
          aria-controls={panelId}
          title={isOpen ? 'Close identity event panel' : 'Open identity event panel'}
          onClick={() => setIsOpen((open) => !open)}
        >
          <Zap className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="sr-only">Toggle identity event form</span>
        </button>

        <div
          id={panelId}
          role="region"
          aria-label="Identity event"
          aria-hidden={!isOpen}
          className={cn(
            'border-foreground/12 bg-background fixed top-0 right-0 z-[101] flex h-full w-full max-w-md flex-col border-l shadow-2xl',
            'transition-transform duration-300 ease-out',
            isOpen ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-5">
            <div className="mb-6">
              {props.fields?.Title ? (
                <Text
                  tag="h2"
                  className="text-foreground mb-2 text-xl font-medium sm:text-2xl"
                  field={props.fields.Title}
                />
              ) : (
                <h2 className="text-foreground mb-2 text-xl font-medium sm:text-2xl">
                  Identity event
                </h2>
              )}
              <p className="text-foreground/80 text-sm">
                Send an IDENTITY event to Sitecore using the Cloud SDK{' '}
                <code className="text-foreground/90 rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
                  identity()
                </code>
                . Required: at least one identifier (provider and id). Optional fields map to{' '}
                <a
                  className="text-accent underline underline-offset-2 hover:opacity-90"
                  href="https://doc.sitecore.com/sdk/en/developers/006/cloud-sdk/identity-events.html"
                  rel="noreferrer"
                  target="_blank"
                >
                  identity event attributes
                </a>
                .
              </p>
            </div>

            {isDevEnv && (
              <div
                className="border-warning/40 bg-warning/10 text-foreground mb-6 rounded-md border px-4 py-3 text-sm"
                role="status"
              >
                Development mode: browser Events SDK initialization is skipped in this app&apos;s{' '}
                <code className="text-xs">Bootstrap</code>, so sending will fail until you use
                production settings or change that behavior.
              </div>
            )}

            {!mode.isNormal && !isDevEnv && (
              <div
                className="border-foreground/15 bg-foreground/5 mb-6 rounded-md border px-4 py-3 text-sm"
                role="status"
              >
                Editing or preview mode: sending identity events is disabled here; open the live
                site to trigger events.
              </div>
            )}

            <form className="grid gap-8" onSubmit={handleSubmit}>
              <fieldset className="grid gap-4 border-0 p-0">
                <legend className="text-foreground mb-2 text-lg font-medium">
                  Identifiers <span className="text-destructive">*</span>
                </legend>
                <p className="text-foreground/75 -mt-1 text-sm">
                  At least one row with Provider and Id. Expiry date must match the SDK&apos;s
                  shortened ISO format (for example{' '}
                  <code className="text-xs">2030-12-31T00:00</code>).
                </p>
                <div className="grid gap-4">
                  {identifiers.map((row, index) => (
                    <div
                      key={index}
                      className="border-foreground/12 grid gap-4 rounded-lg border p-4"
                    >
                      <div className="grid gap-2">
                        <label
                          className="text-foreground/90 text-sm font-medium"
                          htmlFor={`id-provider-${index}`}
                        >
                          Provider
                        </label>
                        <input
                          id={`id-provider-${index}`}
                          value={row.provider}
                          onChange={(e) => updateIdentifier(index, { provider: e.target.value })}
                          className="form-input"
                          placeholder="e.g. email"
                          autoComplete="off"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label
                          className="text-foreground/90 text-sm font-medium"
                          htmlFor={`id-value-${index}`}
                        >
                          Id
                        </label>
                        <input
                          id={`id-value-${index}`}
                          value={row.id}
                          onChange={(e) => updateIdentifier(index, { id: e.target.value })}
                          className="form-input"
                          placeholder="Identifier value"
                          autoComplete="off"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label
                          className="text-foreground/90 text-sm font-medium"
                          htmlFor={`id-exp-${index}`}
                        >
                          Expiry (optional)
                        </label>
                        <input
                          id={`id-exp-${index}`}
                          value={row.expiryDate}
                          onChange={(e) => updateIdentifier(index, { expiryDate: e.target.value })}
                          className="form-input"
                          placeholder="2030-12-31T00:00"
                          autoComplete="off"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-foreground/80 hover:text-foreground border-foreground/15 rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => removeIdentifierRow(index)}
                          disabled={identifiers.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-accent hover:text-accent/90 w-fit text-sm font-medium underline underline-offset-2"
                  onClick={addIdentifierRow}
                >
                  Add identifier
                </button>
              </fieldset>

              <fieldset className="grid gap-4 border-0 p-0">
                <legend className="text-foreground mb-1 text-lg font-medium">
                  Profile (optional)
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-email"
                    >
                      Email
                    </label>
                    <input
                      id="identity-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      inputMode="email"
                      className="form-input"
                      autoComplete="email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-dob"
                    >
                      Date of birth
                    </label>
                    <input
                      id="identity-dob"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="form-input"
                      placeholder="1990-05-07T00:00"
                      autoComplete="bday"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-first"
                    >
                      First name
                    </label>
                    <input
                      id="identity-first"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="form-input"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-last"
                    >
                      Last name
                    </label>
                    <input
                      id="identity-last"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="form-input"
                      autoComplete="family-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-phone"
                    >
                      Phone
                    </label>
                    <input
                      id="identity-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      className="form-input"
                      autoComplete="tel"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-mobile"
                    >
                      Mobile
                    </label>
                    <input
                      id="identity-mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      type="tel"
                      className="form-input"
                      autoComplete="tel-national"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-gender"
                    >
                      Gender
                    </label>
                    <input
                      id="identity-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="form-input"
                      autoComplete="sex"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-title"
                    >
                      Title
                    </label>
                    <input
                      id="identity-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="form-input"
                      autoComplete="honorific-prefix"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-street"
                    >
                      Street lines (optional)
                    </label>
                    <textarea
                      id="identity-street"
                      value={streetLines}
                      onChange={(e) => setStreetLines(e.target.value)}
                      rows={3}
                      className="form-textarea"
                      placeholder={'One line per street line'}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-city"
                    >
                      City
                    </label>
                    <input
                      id="identity-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="form-input"
                      autoComplete="address-level2"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-state"
                    >
                      State / region
                    </label>
                    <input
                      id="identity-state"
                      value={stateField}
                      onChange={(e) => setStateField(e.target.value)}
                      className="form-input"
                      autoComplete="address-level1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-postal"
                    >
                      Postal code
                    </label>
                    <input
                      id="identity-postal"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="form-input"
                      autoComplete="postal-code"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-country"
                    >
                      Country
                    </label>
                    <input
                      id="identity-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="form-input"
                      autoComplete="country-name"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="grid gap-4 border-0 p-0">
                <legend className="text-foreground mb-1 text-lg font-medium">
                  Event attributes (optional)
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-channel"
                    >
                      Channel
                    </label>
                    <input
                      id="identity-channel"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="form-input"
                      placeholder="WEB"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-currency"
                    >
                      Currency
                    </label>
                    <input
                      id="identity-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="form-input"
                      placeholder="USD"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-language"
                    >
                      Language
                    </label>
                    <input
                      id="identity-language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="form-input"
                      placeholder={languagePlaceholder}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      className="text-foreground/90 text-sm font-medium"
                      htmlFor="identity-page"
                    >
                      Page name
                    </label>
                    <input
                      id="identity-page"
                      value={pageName}
                      onChange={(e) => setPageName(e.target.value)}
                      className="form-input"
                      placeholder={route?.name ?? ''}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="grid gap-2">
                <label className="text-foreground/90 text-sm font-medium" htmlFor="identity-ext">
                  Extension data (optional JSON object)
                </label>
                <textarea
                  id="identity-ext"
                  value={extensionJson}
                  onChange={(e) => setExtensionJson(e.target.value)}
                  rows={4}
                  className="form-textarea font-mono text-sm"
                  placeholder={'{\n  "loyaltyTier": "gold"\n}'}
                />
                <p className="text-foreground/65 text-xs">
                  Nested objects are flattened when sent; maximum 50 extension properties.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="arrow-btn inline-flex cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'loading' ? (
                    'Sending…'
                  ) : props.fields?.SubmitLabel ? (
                    <Text tag="span" field={props.fields.SubmitLabel} />
                  ) : (
                    'Send identity event'
                  )}
                </button>
                {status === 'success' && (
                  <span className="text-success text-sm font-medium">Event sent.</span>
                )}
                {status === 'error' && (
                  <span className="text-destructive text-sm font-medium">
                    Could not complete request.
                  </span>
                )}
              </div>

              {resultMessage && (
                <pre
                  className="border-foreground/12 bg-foreground/5 text-foreground/90 max-h-80 overflow-auto rounded-lg border p-4 text-xs whitespace-pre-wrap"
                  role="region"
                  aria-live="polite"
                >
                  {resultMessage}
                </pre>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
