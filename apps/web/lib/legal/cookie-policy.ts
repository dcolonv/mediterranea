/**
 * Cookie policy content (EN/ES).
 *
 * The tables below describe the cookies and local storage this site actually
 * sets — keep them in sync with `lib/consent.ts`, the auth session routes and
 * the language provider whenever storage changes.
 *
 * NOTE FOR THE STUDIO: the controller block needs the registered legal name and
 * tax number (NIF/CIF) before publication, and the whole document should be
 * reviewed by your legal adviser.
 */
import { CONTACT_INFO } from '@mediterranea/shared/constants';

export interface CookieRow {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  type: string;
}

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { caption: string; rows: CookieRow[] };
}

export interface CookiePolicy {
  title: string;
  updated: string;
  intro: string[];
  columns: { name: string; provider: string; purpose: string; duration: string; type: string };
  sections: PolicySection[];
}

/** Update when the policy text or the cookie tables change. */
const LAST_UPDATED = { en: '4 September 2026', es: '4 de septiembre de 2026' };

const NECESSARY_EN: CookieRow[] = [
  {
    name: 'locale',
    provider: 'mediterraneafacestudio.com (first party)',
    purpose:
      'Stores the language you chose (Spanish or English) so the site is shown in it on later visits.',
    duration: '1 year',
    type: 'HTTP cookie',
  },
  {
    name: '__customer',
    provider: 'mediterraneafacestudio.com (first party)',
    purpose:
      'Keeps you signed in to your client account so you can see and manage your appointments. Only set when you log in.',
    duration: '5 days',
    type: 'HTTP cookie (HttpOnly, Secure, SameSite=Lax)',
  },
  {
    name: '__session',
    provider: 'mediterraneafacestudio.com (first party)',
    purpose:
      'Keeps studio staff signed in to the administration area. Only set when a staff member logs in.',
    duration: '7 days',
    type: 'HTTP cookie (HttpOnly, Secure, SameSite=Lax)',
  },
  {
    name: 'cookie-consent',
    provider: 'mediterraneafacestudio.com (first party)',
    purpose:
      'Records whether you accepted or rejected analytics cookies, so we do not ask again on every page. Stored in your browser’s local storage and never sent to our servers.',
    duration: 'Until you clear your browser storage',
    type: 'Local storage',
  },
  {
    name: 'firebaseLocalStorageDb',
    provider: 'Google Firebase (processor)',
    purpose:
      'Holds the authentication token for a signed-in client account. Only created when you log in.',
    duration: 'Until you sign out or clear browser storage',
    type: 'IndexedDB (local storage)',
  },
];

const ANALYTICS_EN: CookieRow[] = [
  {
    name: '_ga',
    provider: 'Google (Google Analytics 4 via Firebase)',
    purpose:
      'Assigns a random identifier to your browser so repeat visits can be counted as one visitor, producing aggregate audience statistics.',
    duration: '2 years',
    type: 'HTTP cookie (third party)',
  },
  {
    name: '_ga_<container-id>',
    provider: 'Google (Google Analytics 4 via Firebase)',
    purpose:
      'Maintains the state of the analytics session (for example, when a visit starts and ends).',
    duration: '2 years',
    type: 'HTTP cookie (third party)',
  },
];

const NECESSARY_ES: CookieRow[] = [
  {
    name: 'locale',
    provider: 'mediterraneafacestudio.com (propia)',
    purpose:
      'Guarda el idioma que has elegido (español o inglés) para mostrarte el sitio en ese idioma en visitas posteriores.',
    duration: '1 año',
    type: 'Cookie HTTP',
  },
  {
    name: '__customer',
    provider: 'mediterraneafacestudio.com (propia)',
    purpose:
      'Mantiene tu sesión iniciada en tu cuenta de cliente para que puedas consultar y gestionar tus citas. Solo se instala si inicias sesión.',
    duration: '5 días',
    type: 'Cookie HTTP (HttpOnly, Secure, SameSite=Lax)',
  },
  {
    name: '__session',
    provider: 'mediterraneafacestudio.com (propia)',
    purpose:
      'Mantiene la sesión iniciada del personal del estudio en el área de administración. Solo se instala si inicia sesión personal autorizado.',
    duration: '7 días',
    type: 'Cookie HTTP (HttpOnly, Secure, SameSite=Lax)',
  },
  {
    name: 'cookie-consent',
    provider: 'mediterraneafacestudio.com (propia)',
    purpose:
      'Registra si has aceptado o rechazado las cookies analíticas, para no volver a preguntártelo en cada página. Se guarda en el almacenamiento local de tu navegador y nunca se envía a nuestros servidores.',
    duration: 'Hasta que borres el almacenamiento de tu navegador',
    type: 'Almacenamiento local',
  },
  {
    name: 'firebaseLocalStorageDb',
    provider: 'Google Firebase (encargado del tratamiento)',
    purpose:
      'Conserva el testigo de autenticación de una cuenta de cliente con la sesión iniciada. Solo se crea si inicias sesión.',
    duration: 'Hasta que cierres sesión o borres el almacenamiento',
    type: 'IndexedDB (almacenamiento local)',
  },
];

const ANALYTICS_ES: CookieRow[] = [
  {
    name: '_ga',
    provider: 'Google (Google Analytics 4 a través de Firebase)',
    purpose:
      'Asigna un identificador aleatorio a tu navegador para contabilizar las visitas repetidas como un único usuario y elaborar estadísticas agregadas de audiencia.',
    duration: '2 años',
    type: 'Cookie HTTP (de tercero)',
  },
  {
    name: '_ga_<id-de-contenedor>',
    provider: 'Google (Google Analytics 4 a través de Firebase)',
    purpose:
      'Mantiene el estado de la sesión analítica (por ejemplo, cuándo comienza y termina una visita).',
    duration: '2 años',
    type: 'Cookie HTTP (de tercero)',
  },
];

const EN: CookiePolicy = {
  title: 'Cookie Policy',
  updated: `Last updated: ${LAST_UPDATED.en}`,
  intro: [
    'This Cookie Policy explains what cookies and similar technologies (local storage and IndexedDB) are used on this website, for what purposes, how long they last, and how you can accept, reject or withdraw your consent at any time.',
    'It is provided in compliance with Article 22.2 of Spanish Law 34/2002 on Information Society Services and Electronic Commerce (LSSI-CE), Regulation (EU) 2016/679 (GDPR) and Spanish Organic Law 3/2018 (LOPDGDD).',
  ],
  columns: {
    name: 'Name',
    provider: 'Provider',
    purpose: 'Purpose',
    duration: 'Retention',
    type: 'Type',
  },
  sections: [
    {
      heading: '1. Who is responsible for your data',
      paragraphs: [
        `Mediterránea Face Studio (the “Studio”), with its establishment at ${CONTACT_INFO.address}, ${CONTACT_INFO.city}, is the data controller for the personal data processed through the cookies described in this policy.`,
        `For any question about this policy or to exercise your rights, you can write to ${CONTACT_INFO.email} or call ${CONTACT_INFO.phone}.`,
      ],
    },
    {
      heading: '2. What cookies are',
      paragraphs: [
        'A cookie is a small file that a website stores in your browser when you visit it. Similar technologies, such as local storage and IndexedDB, also store information in your device. In this policy we refer to all of them as “cookies”.',
        'Cookies can be set by us (first-party cookies) or by a third party whose service we use (third-party cookies), and they can be deleted at the end of your session or kept for a defined period.',
      ],
    },
    {
      heading: '3. Legal basis',
      paragraphs: [
        'Strictly necessary cookies are used on the basis of the legitimate interest in providing the service you request, and are exempt from consent under Article 22.2 LSSI-CE, since without them the website cannot function.',
        'Analytics cookies are only installed with your prior, express and informed consent, given by clicking “Accept” in the cookie banner. You may refuse them without any consequence for your use of the site, and withdraw your consent at any time.',
      ],
    },
    {
      heading: '4. Strictly necessary cookies',
      paragraphs: [
        'These cookies are required for the website to work: they remember your language, keep your session open and store your cookie choice. They are not used for advertising and do not profile you.',
      ],
      table: { caption: 'Strictly necessary', rows: NECESSARY_EN },
    },
    {
      heading: '5. Analytics cookies (optional)',
      paragraphs: [
        'We use Google Analytics 4, through Google Firebase, to understand how many people visit the site and which pages they use, so we can improve it. The statistics we consult are aggregated: we do not use them to identify you individually, and we do not use these cookies for advertising or to build profiles for third parties.',
        'These cookies are not installed unless you accept them. If you reject them, the analytics script is not loaded at all and any analytics cookie left from a previous acceptance is deleted.',
      ],
      table: { caption: 'Analytics — only with your consent', rows: ANALYTICS_EN },
    },
    {
      heading: '6. Measurement without cookies',
      paragraphs: [
        'Independently of the cookies above, we use Vercel Web Analytics, provided by our hosting provider, to count page views. This tool stores nothing on your device and reads nothing from it: it sets no cookie and uses neither local storage nor IndexedDB, so it falls outside the consent requirement of Article 22.2 LSSI-CE and works whether you accept or reject analytics cookies.',
        'For each page view it records only the page visited, the referring site, and the country, browser family, operating system and device type derived from the request. To recognise whether two views belong to the same visit, an irreversible hash is calculated from your IP address and browser characteristics using a secret key that changes every day; your IP address is not stored, the hash cannot be traced back to you, and the link is lost when the daily key rotates.',
        'The lawful basis is our legitimate interest (Article 6.1.f GDPR) in knowing how many people visit the site and which pages they use, in a form that does not identify you, does not build profiles and is not used for advertising. You may object to this processing at any time by writing to ' +
          CONTACT_INFO.email +
          '.',
        'The provider is Vercel Inc., acting as data processor under a data processing agreement that includes the European Commission’s Standard Contractual Clauses for any transfer outside the European Economic Area.',
      ],
    },
    {
      heading: '7. Third parties and international transfers',
      paragraphs: [
        'Analytics cookies are provided by Google Ireland Limited, which may transfer data to servers outside the European Economic Area. Such transfers are covered by the safeguards offered by Google, including the EU-US Data Privacy Framework and the European Commission’s Standard Contractual Clauses.',
        'You can read Google’s privacy information at policies.google.com/privacy and its description of how it uses data from sites that use its services at policies.google.com/technologies/partner-sites.',
      ],
    },
    {
      heading: '8. How to accept, reject or change your choice',
      paragraphs: [
        'The first time you visit, a banner lets you accept or reject analytics cookies with a single click; both options are equally accessible, and no analytics cookie is installed before you choose.',
        'You can change your decision at any time from the “Cookie settings” link in the footer of the site. Withdrawing consent does not affect the lawfulness of the processing carried out before you withdrew it.',
        'You can also block or delete cookies from your browser settings. Note that blocking strictly necessary cookies may prevent parts of the site, such as booking or your client account, from working correctly.',
      ],
      bullets: [
        'Google Chrome: Settings → Privacy and security → Third-party cookies',
        'Safari: Settings → Privacy → Manage website data',
        'Mozilla Firefox: Settings → Privacy & Security → Cookies and Site Data',
        'Microsoft Edge: Settings → Cookies and site permissions',
      ],
    },
    {
      heading: '9. Retention',
      paragraphs: [
        'Each cookie is kept for the period stated in the tables above, unless you delete it earlier from your browser. The record of your cookie choice is kept until you clear your browser storage or change your decision.',
      ],
    },
    {
      heading: '10. Your rights',
      paragraphs: [
        'You have the right to request access to your personal data, and its rectification or erasure, as well as to request the restriction of processing, to object to processing, and to data portability. You may exercise these rights by writing to ' +
          CONTACT_INFO.email +
          '.',
        'You also have the right to lodge a complaint with the Spanish Data Protection Agency (Agencia Española de Protección de Datos, www.aepd.es) if you consider that your rights have not been respected.',
      ],
    },
    {
      heading: '11. Changes to this policy',
      paragraphs: [
        'We may update this policy when the cookies we use change or when required by law. The date at the top shows when it was last revised; we recommend reviewing it periodically.',
      ],
    },
  ],
};

const ES: CookiePolicy = {
  title: 'Política de Cookies',
  updated: `Última actualización: ${LAST_UPDATED.es}`,
  intro: [
    'Esta Política de Cookies explica qué cookies y tecnologías similares (almacenamiento local e IndexedDB) se utilizan en este sitio web, con qué finalidad, durante cuánto tiempo y cómo puedes aceptarlas, rechazarlas o retirar tu consentimiento en cualquier momento.',
    'Se facilita en cumplimiento del artículo 22.2 de la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), del Reglamento (UE) 2016/679 (RGPD) y de la Ley Orgánica 3/2018 (LOPDGDD).',
  ],
  columns: {
    name: 'Nombre',
    provider: 'Proveedor',
    purpose: 'Finalidad',
    duration: 'Conservación',
    type: 'Tipo',
  },
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      paragraphs: [
        `Mediterránea Face Studio (el “Estudio”), con establecimiento en ${CONTACT_INFO.address}, ${CONTACT_INFO.city}, es el responsable del tratamiento de los datos personales tratados mediante las cookies descritas en esta política.`,
        `Para cualquier consulta sobre esta política o para ejercer tus derechos, puedes escribir a ${CONTACT_INFO.email} o llamar al ${CONTACT_INFO.phone}.`,
      ],
    },
    {
      heading: '2. Qué son las cookies',
      paragraphs: [
        'Una cookie es un pequeño archivo que un sitio web guarda en tu navegador cuando lo visitas. Otras tecnologías similares, como el almacenamiento local o IndexedDB, también guardan información en tu dispositivo. En esta política nos referimos a todas ellas como “cookies”.',
        'Las cookies pueden ser instaladas por nosotros (cookies propias) o por un tercero cuyo servicio utilizamos (cookies de terceros), y pueden borrarse al finalizar la sesión o conservarse durante un plazo determinado.',
      ],
    },
    {
      heading: '3. Base jurídica',
      paragraphs: [
        'Las cookies estrictamente necesarias se utilizan sobre la base del interés legítimo en prestar el servicio que solicitas y están exentas de consentimiento conforme al artículo 22.2 de la LSSI-CE, ya que sin ellas el sitio web no puede funcionar.',
        'Las cookies analíticas solo se instalan con tu consentimiento previo, expreso e informado, prestado al pulsar “Aceptar” en el aviso de cookies. Puedes rechazarlas sin ninguna consecuencia para el uso del sitio y retirar tu consentimiento en cualquier momento.',
      ],
    },
    {
      heading: '4. Cookies estrictamente necesarias',
      paragraphs: [
        'Estas cookies son imprescindibles para que el sitio funcione: recuerdan tu idioma, mantienen tu sesión abierta y guardan tu decisión sobre las cookies. No se utilizan con fines publicitarios ni para elaborar perfiles.',
      ],
      table: { caption: 'Estrictamente necesarias', rows: NECESSARY_ES },
    },
    {
      heading: '5. Cookies analíticas (opcionales)',
      paragraphs: [
        'Utilizamos Google Analytics 4, a través de Google Firebase, para conocer cuántas personas visitan el sitio y qué páginas consultan, con el fin de mejorarlo. Las estadísticas que consultamos son agregadas: no las utilizamos para identificarte individualmente ni con fines publicitarios o de elaboración de perfiles para terceros.',
        'Estas cookies no se instalan salvo que las aceptes. Si las rechazas, el script analítico no llega a cargarse y se eliminan las cookies analíticas que hubieran quedado de una aceptación anterior.',
      ],
      table: { caption: 'Analíticas — solo con tu consentimiento', rows: ANALYTICS_ES },
    },
    {
      heading: '6. Medición sin cookies',
      paragraphs: [
        'Con independencia de las cookies anteriores, utilizamos Vercel Web Analytics, servicio de nuestro proveedor de alojamiento, para contabilizar las páginas vistas. Esta herramienta no almacena nada en tu dispositivo ni lee nada de él: no instala ninguna cookie ni utiliza almacenamiento local o IndexedDB, por lo que queda fuera de la exigencia de consentimiento del artículo 22.2 de la LSSI-CE y funciona tanto si aceptas como si rechazas las cookies analíticas.',
        'De cada página vista únicamente registra la página visitada, el sitio de procedencia y el país, la familia de navegador, el sistema operativo y el tipo de dispositivo deducidos de la petición. Para reconocer si dos visualizaciones pertenecen a una misma visita se calcula un valor hash irreversible a partir de tu dirección IP y de las características de tu navegador, empleando una clave secreta que cambia cada día; tu dirección IP no se conserva, el hash no permite volver a identificarte y la asociación se pierde al rotar la clave diaria.',
        'La base jurídica es nuestro interés legítimo (artículo 6.1.f del RGPD) en conocer cuántas personas visitan el sitio y qué páginas consultan, de una forma que no te identifica, no elabora perfiles y no se utiliza con fines publicitarios. Puedes oponerte a este tratamiento en cualquier momento escribiendo a ' +
          CONTACT_INFO.email +
          '.',
        'El proveedor es Vercel Inc., que actúa como encargado del tratamiento en virtud de un contrato que incorpora las Cláusulas Contractuales Tipo de la Comisión Europea para cualquier transferencia fuera del Espacio Económico Europeo.',
      ],
    },
    {
      heading: '7. Terceros y transferencias internacionales',
      paragraphs: [
        'Las cookies analíticas son proporcionadas por Google Ireland Limited, que puede transferir datos a servidores situados fuera del Espacio Económico Europeo. Dichas transferencias están amparadas por las garantías ofrecidas por Google, entre ellas el Marco de Privacidad de Datos UE-EE. UU. y las Cláusulas Contractuales Tipo de la Comisión Europea.',
        'Puedes consultar la información de privacidad de Google en policies.google.com/privacy y su descripción del uso de datos procedentes de sitios que utilizan sus servicios en policies.google.com/technologies/partner-sites.',
      ],
    },
    {
      heading: '8. Cómo aceptar, rechazar o cambiar tu decisión',
      paragraphs: [
        'En tu primera visita, un aviso te permite aceptar o rechazar las cookies analíticas con un solo clic; ambas opciones son igualmente accesibles y no se instala ninguna cookie analítica antes de que elijas.',
        'Puedes cambiar tu decisión en cualquier momento desde el enlace “Configuración de cookies” situado en el pie del sitio. La retirada del consentimiento no afecta a la licitud del tratamiento realizado con anterioridad.',
        'También puedes bloquear o eliminar las cookies desde la configuración de tu navegador. Ten en cuenta que bloquear las cookies estrictamente necesarias puede impedir el funcionamiento correcto de partes del sitio, como la reserva de citas o tu cuenta de cliente.',
      ],
      bullets: [
        'Google Chrome: Configuración → Privacidad y seguridad → Cookies de terceros',
        'Safari: Ajustes → Privacidad → Gestionar datos de sitios web',
        'Mozilla Firefox: Ajustes → Privacidad y seguridad → Cookies y datos del sitio',
        'Microsoft Edge: Configuración → Cookies y permisos del sitio',
      ],
    },
    {
      heading: '9. Conservación',
      paragraphs: [
        'Cada cookie se conserva durante el plazo indicado en las tablas anteriores, salvo que la elimines antes desde tu navegador. El registro de tu decisión sobre las cookies se conserva hasta que borres el almacenamiento de tu navegador o cambies tu elección.',
      ],
    },
    {
      heading: '10. Tus derechos',
      paragraphs: [
        'Tienes derecho a solicitar el acceso a tus datos personales, su rectificación o supresión, así como a solicitar la limitación del tratamiento, a oponerte al mismo y a la portabilidad de los datos. Puedes ejercer estos derechos escribiendo a ' +
          CONTACT_INFO.email +
          '.',
        'Asimismo, tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es) si consideras que no se han respetado tus derechos.',
      ],
    },
    {
      heading: '11. Cambios en esta política',
      paragraphs: [
        'Podemos actualizar esta política cuando cambien las cookies que utilizamos o cuando así lo exija la normativa. La fecha que figura al inicio indica su última revisión; te recomendamos consultarla periódicamente.',
      ],
    },
  ],
};

export function getCookiePolicy(locale: string): CookiePolicy {
  return locale === 'es' ? ES : EN;
}
