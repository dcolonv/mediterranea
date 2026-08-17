import type { Locale } from './config';

const en = {
  nav: {
    home: 'Home',
    treatments: 'Treatments',
    about: 'About',
    contact: 'Contact',
    account: 'Account',
    giftCards: 'Gift Cards',
    blog: 'Blog',
    bookNow: 'Book Now',
  },
  footer: {
    navigate: 'Navigate',
    contact: 'Contact',
    hours: 'Hours',
    home: 'Home',
    services: 'Services',
    about: 'About Us',
    book: 'Book Appointment',
    monFri: 'Mon - Fri',
    saturday: 'Saturday',
    sunday: 'Sunday',
    satSun: 'Sat - Sun',
    closed: 'Closed',
    rights: (year: number) => `© ${year} Mediterránea Face Studio. All rights reserved.`,
  },
  comingSoon: {
    eyebrow: 'Grand Opening',
    heading: 'A New Face Studio\nin East Málaga',
    descriptionPrefix: 'Mediterránea Face Studio opens on ',
    date: 'September 8th, 2026',
    descriptionSuffix: 'A space dedicated to personalized facial treatments.',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    open: 'We’re open. Welcome.',
  },
  hero: {
    eyebrow: 'Personalized Facial Treatments',
    headingLine1: 'Facial Care,',
    headingLine2: 'Made for You',
    description:
      'A studio dedicated to personalized facial treatments in East Málaga. Every session is tailored to your skin, with warm, attentive Mediterranean care.',
    book: 'Book Appointment',
    explore: 'Explore Facials',
  },
  services: {
    eyebrow: 'What We Offer',
    title: 'Three ways to care for your skin',
    subtitle: 'A fully personalized session, a single focused treatment, or a targeted INDIBA facial.',
    customName: 'Custom Facial',
    customDuration: '1.5–2 hours',
    customDesc:
      'We analyze your skin in the studio and design a session around what it needs, from hydration and firming to even tone, fading marks and softening expression lines, for complete, tailored care.',
    focusName: 'Focus Facial',
    focusDuration: '45 minutes',
    focusDesc:
      'A single, targeted treatment for when you know exactly what your skin needs, whether peeling, dermapen or hydration.',
    indibaName: 'INDIBA Facial',
    indibaDuration: '45–60 minutes',
    indibaDesc:
      'A radiofrequency facial that boosts circulation and collagen from within, for firmer, revitalized skin with a natural glow.',
    cta: 'Book Your Facial',
    minutes: 'min',
  },
  about: {
    storyEyebrow: 'Our Story',
    storyTitle: 'Meet Dr. Mariana',
    storyP1:
      'Hi, I’m Dr. Mariana, the founder of Mediterránea Face Studio. I hold a doctorate in pharmacy and have always been fascinated by the connection between skin health and overall well-being. Mediterránea was born from a desire to offer results-driven facial treatments, delivered with warmth, care, and presence.',
    storyP2:
      'I believe beauty is not about covering up, but about uncovering your natural radiance through knowledge, balance, and gentle care. Each treatment at Mediterránea is customized to your skin’s unique needs, using carefully selected products and the latest in facial technology.',
    valuesEyebrow: 'Our Values',
    valuesTitle: 'What We Stand For',
    value1Title: 'High-Quality Products',
    value1Desc:
      'We use only premium dermo-cosmetic products, carefully chosen for their performance, skin compatibility, and long-term benefits. Your skin deserves the best, and that is exactly what we deliver.',
    value2Title: 'Transparent Ingredients',
    value2Desc:
      'No secrets, no gimmicks. We believe you have the right to know what goes on your skin. That’s why we’re always happy to explain the ingredients we use and why they matter. Education is part of your glow.',
    value3Title: 'Ethically Sourced Materials',
    value3Desc:
      'We’re committed to sourcing our materials with care and responsibility. From the lab to your skin, we prioritize sustainability, cruelty-free processes, and human-centered values at every step.',
  },
  cta: {
    line1: 'Facial care, personalized to you,',
    line2Prefix: 'delivered with ',
    line2Accent: 'warmth and care',
    body: 'A full custom session or a single focused treatment. Every visit is tailored to your skin, with genuine care and attention.',
    button: 'Reserve Your Visit',
  },
  contactSection: {
    eyebrow: 'Get In Touch',
    title: 'Contact Us',
    subtitle:
      'We’d love to hear from you. Reach out to schedule a consultation or ask any questions.',
    locationTitle: 'Location',
    contactTitle: 'Contact',
    hoursTitle: 'Hours',
    monFri: 'Mon - Fri',
    saturday: 'Saturday',
    sunday: 'Sunday',
    satSun: 'Sat - Sun',
    closed: 'Closed',
  },
  treatments: {
    eyebrow: 'Our Menu',
    title: 'Treatments',
    subtitle: 'Facials and advanced facial treatments, tailored to your skin.',
    facials: 'Facials',
    advanced: 'Advanced Treatments',
    comingSoon: 'Our treatment menu is coming soon.',
    details: 'Details',
    book: 'Book',
    minutes: 'min',
  },
  treatmentDetail: {
    back: 'All treatments',
    book: 'Book this treatment',
  },
  technology: {
    eyebrow: 'What We Use',
    title: 'Treatment Technology',
    subtitle:
      'The tools and technology behind every Mediterránea facial, combined and tailored to what your skin needs.',
    items: [
      {
        name: 'INDIBA',
        description:
          'Radiofrequency that works from within to boost circulation and collagen, for firmer, revitalized skin.',
      },
      {
        name: 'LED Light Therapy',
        description:
          'Targeted red and blue light to calm the skin, even out tone and boost a healthy glow.',
      },
      {
        name: 'Diamond Tip Microdermabrasion',
        description:
          'Gentle diamond-tip exfoliation that lifts away dead cells and refines texture for smoother, brighter skin.',
      },
      {
        name: 'Zemits Hot & Cold Galvanic Therapy',
        description:
          'A warm phase preps the skin to absorb active ingredients, while the cold phase soothes, calms and tightens.',
      },
      {
        name: 'Microneedling',
        description:
          'Micro-stimulation that encourages the skin’s natural renewal and helps serums penetrate for firmer, refined skin.',
      },
      {
        name: 'Zemits Sonosilk Ultrasonic Skin Scrubber',
        description:
          'Ultrasonic vibrations for a deep yet delicate cleanse, lifting away impurities and dead skin.',
      },
      {
        name: 'Zemits Elastistrom Microcurrent Gloves',
        description:
          'Low-level microcurrent that tones and lifts the facial muscles for a firmer, more defined contour.',
      },
      {
        name: 'High Frequency',
        description:
          'A gentle high-frequency current that purifies, helps calm blemish-prone skin and boosts circulation for a fresh glow.',
      },
    ],
  },
  products: {
    eyebrow: 'Products We Work With',
    title: 'Brands We Trust',
    subtitle:
      'Professional skincare lines we combine to get the best results for your skin.',
    visit: 'Visit site',
    items: [
      {
        name: 'Omorovicza',
        description:
          'Luxury Hungarian skincare drawing on mineral-rich healing thermal waters.',
        url: 'https://www.omorovicza.eu/',
      },
      {
        name: 'Mesoestetic',
        description:
          'Spanish professional-grade cosmeceuticals for advanced, results-driven skin care.',
        url: 'https://www.mesoestetic.es/',
      },
      {
        name: 'Esthemax',
        description:
          'Professional skincare known for its nourishing hydrojelly masks and active treatments.',
        url: 'https://esthemaxeuropa.com/',
      },
    ],
  },
  contactPage: {
    eyebrow: 'Visit Us',
    title: 'Contact & Hours',
    getInTouch: 'Get in touch',
    address: 'Address',
    whatsapp: 'WhatsApp',
    email: 'Email',
    openingHours: 'Opening hours',
    closed: 'Closed',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  },
  booking: {
    eyebrow: 'Reservation',
    title: 'Book your appointment',
    stepTreatment: 'Treatment',
    stepPractitioner: 'Practitioner',
    stepTime: 'Date & time',
    stepDetails: 'Your details',
    chooseTreatment: 'Choose your facial',
    chooseFocus: 'Choose a focus treatment',
    chooseIndiba: 'Choose an INDIBA option',
    from: 'from',
    noTreatments: 'No treatments are available to book right now.',
    choosePractitioner: 'Choose a practitioner',
    forService: 'For',
    anyAvailable: 'Any available',
    fastest: 'Fastest availability',
    pickDateTime: 'Pick a date & time',
    anyPractitioner: 'Any practitioner',
    date: 'Date',
    findTimes: 'Find times',
    finding: 'Finding…',
    noTimes: 'No open times on this date. Try another day.',
    selectDatePrompt: 'Select a date to see available times.',
    slotAvailable: 'Available',
    slotBooked: 'Booked',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    back: 'Back',
    yourDetails: 'Your details',
    fullName: 'Full name',
    email: 'Email',
    phone: 'Phone',
    notes: 'Anything we should know? (optional)',
    confirm: 'Confirm booking',
    booking: 'Booking…',
    booked: 'You’re booked',
    with: 'with',
    at: 'at',
    confirmationPrefix: 'A confirmation will follow at ',
    confirmationSuffix: '. We look forward to seeing you.',
    addToCalendar: 'Add to calendar',
    bookAnother: 'Book another',
    provideDetails: 'Please provide your name, email, and phone.',
  },
  lang: {
    switchToSpanish: 'Ver en español',
    switchToEnglish: 'View in English',
  },
  reviews: {
    sectionEyebrow: 'What Clients Say',
    sectionTitle: 'Reviews',
    empty: 'Be the first to share your experience.',
    leaveReview: 'Leave a review',
    yourRating: 'Your rating',
    comment: 'Your comment (optional)',
    submit: 'Submit review',
    submitting: 'Submitting…',
    thanks: 'Thank you for your review!',
    reviewed: 'Reviewed',
    cancel: 'Cancel',
  },
  giftCards: {
    eyebrow: 'Give the Gift of Radiance',
    title: 'Gift Cards',
    subtitle: 'A treatment they’ll love, delivered by email.',
    amount: 'Amount',
    custom: 'Custom amount',
    yourName: 'Your name',
    yourEmail: 'Your email',
    recipientName: 'Recipient’s name (optional)',
    recipientEmail: 'Recipient’s email (optional)',
    recipientHint: 'Leave the recipient blank to receive the card yourself.',
    message: 'Message (optional)',
    continue: 'Continue to payment',
    processing: 'Redirecting…',
    unavailable: 'Online gift cards are coming soon. Please contact us to purchase one.',
    successTitle: 'Thank you!',
    successBody: 'Your gift card is on its way by email.',
    backHome: 'Back to home',
  },
  blog: {
    eyebrow: 'Journal',
    title: 'Skincare Journal',
    subtitle: 'Tips, treatments, and news from the studio.',
    empty: 'Our first stories are coming soon.',
    readMore: 'Read more',
    back: 'All articles',
  },
};

// Spanish translation — same shape as `en`.
const es: typeof en = {
  nav: {
    home: 'Inicio',
    treatments: 'Tratamientos',
    about: 'Nosotros',
    contact: 'Contacto',
    account: 'Mi cuenta',
    giftCards: 'Regalos',
    blog: 'Blog',
    bookNow: 'Reservar',
  },
  footer: {
    navigate: 'Navegación',
    contact: 'Contacto',
    hours: 'Horario',
    home: 'Inicio',
    services: 'Servicios',
    about: 'Sobre nosotros',
    book: 'Reservar cita',
    monFri: 'Lun - Vie',
    saturday: 'Sábado',
    sunday: 'Domingo',
    satSun: 'Sáb - Dom',
    closed: 'Cerrado',
    rights: (year: number) => `© ${year} Mediterránea Face Studio. Todos los derechos reservados.`,
  },
  comingSoon: {
    eyebrow: 'Gran Apertura',
    heading: 'Un Nuevo Estudio Facial\nen Málaga Este',
    descriptionPrefix: 'Mediterránea Face Studio abre el ',
    date: '8 de septiembre de 2026',
    descriptionSuffix: 'Un espacio dedicado a los tratamientos faciales personalizados.',
    days: 'Días',
    hours: 'Horas',
    minutes: 'Minutos',
    seconds: 'Segundos',
    open: 'Ya estamos abiertos. Te esperamos.',
  },
  hero: {
    eyebrow: 'Tratamientos Faciales Personalizados',
    headingLine1: 'Cuidado Facial,',
    headingLine2: 'Hecho para Ti',
    description:
      'Un estudio dedicado a los tratamientos faciales personalizados en Málaga Este. Cada sesión se adapta a tu piel, con el cálido y atento cuidado mediterráneo.',
    book: 'Reservar cita',
    explore: 'Ver faciales',
  },
  services: {
    eyebrow: 'Lo Que Ofrecemos',
    title: 'Tres formas de cuidar tu piel',
    subtitle: 'Una sesión personalizada, un tratamiento único y focalizado, o un facial INDIBA específico.',
    customName: 'Facial Personalizado',
    customDuration: '1,5–2 horas',
    customDesc:
      'Analizamos tu piel en el estudio y diseñamos una sesión según lo que necesita, desde hidratación y reafirmación hasta unificación del tono, atenuar marcas y suavizar las líneas de expresión, para un cuidado completo y a medida.',
    focusName: 'Facial Focalizado',
    focusDuration: '45 minutos',
    focusDesc:
      'Un tratamiento único y focalizado para cuando sabes exactamente qué necesita tu piel, ya sea peeling, dermapen o hidratación.',
    indibaName: 'Facial INDIBA',
    indibaDuration: '45–60 minutos',
    indibaDesc:
      'Un facial de radiofrecuencia que activa la circulación y el colágeno desde el interior, para una piel más firme, revitalizada y con luminosidad natural.',
    cta: 'Reserva tu cita',
    minutes: 'min',
  },
  about: {
    storyEyebrow: 'Nuestra Historia',
    storyTitle: 'Conoce a la Dra. Mariana',
    storyP1:
      'Hola, soy la Dra. Mariana, fundadora de Mediterránea Face Studio. Soy doctora en farmacia y siempre me ha fascinado la conexión entre la salud de la piel y el bienestar general. Mediterránea nació del deseo de ofrecer tratamientos faciales con resultados reales, brindados con calidez, cuidado y presencia.',
    storyP2:
      'Creo que la belleza no se trata de disimular, sino de revelar tu resplandor natural a través del conocimiento, el equilibrio y el cuidado delicado. Cada tratamiento en Mediterránea se personaliza según las necesidades únicas de tu piel, con productos cuidadosamente seleccionados y la última tecnología facial.',
    valuesEyebrow: 'Nuestros Valores',
    valuesTitle: 'Lo Que Defendemos',
    value1Title: 'Productos de Alta Calidad',
    value1Desc:
      'Usamos solo productos dermocosméticos premium, elegidos cuidadosamente por su rendimiento, compatibilidad con la piel y beneficios a largo plazo. Tu piel merece lo mejor, y eso es justo lo que ofrecemos.',
    value2Title: 'Ingredientes Transparentes',
    value2Desc:
      'Sin secretos ni trucos. Creemos que tienes derecho a saber qué se aplica en tu piel. Por eso siempre explicamos con gusto los ingredientes que usamos y por qué importan. La educación es parte de tu luz.',
    value3Title: 'Materiales de Origen Ético',
    value3Desc:
      'Nos comprometemos a obtener nuestros materiales con cuidado y responsabilidad. Del laboratorio a tu piel, priorizamos la sostenibilidad, los procesos libres de crueldad y los valores centrados en las personas en cada paso.',
  },
  cta: {
    line1: 'Cuidado facial, personalizado para ti,',
    line2Prefix: 'brindado con ',
    line2Accent: 'calidez y cuidado',
    body: 'Una sesión personalizada completa o un tratamiento único y focalizado: adaptamos cada visita a tu piel, con verdadero cuidado y atención.',
    button: 'Reserva tu visita',
  },
  contactSection: {
    eyebrow: 'Contáctanos',
    title: 'Contacto',
    subtitle:
      'Nos encantaría saber de ti. Escríbenos para agendar una consulta o resolver cualquier duda.',
    locationTitle: 'Ubicación',
    contactTitle: 'Contacto',
    hoursTitle: 'Horario',
    monFri: 'Lun - Vie',
    saturday: 'Sábado',
    sunday: 'Domingo',
    satSun: 'Sáb - Dom',
    closed: 'Cerrado',
  },
  treatments: {
    eyebrow: 'Nuestro Menú',
    title: 'Tratamientos',
    subtitle: 'Faciales y tratamientos faciales avanzados, adaptados a tu piel.',
    facials: 'Faciales',
    advanced: 'Tratamientos Avanzados',
    comingSoon: 'Nuestro menú de tratamientos estará disponible pronto.',
    details: 'Detalles',
    book: 'Reservar',
    minutes: 'min',
  },
  treatmentDetail: {
    back: 'Todos los tratamientos',
    book: 'Reservar este tratamiento',
  },
  technology: {
    eyebrow: 'Lo Que Usamos',
    title: 'Tecnología de Tratamiento',
    subtitle:
      'Las herramientas y la tecnología detrás de cada facial de Mediterránea, combinadas y adaptadas a lo que tu piel necesita.',
    items: [
      {
        name: 'INDIBA',
        description:
          'Radiofrecuencia que actúa desde el interior para activar la circulación y el colágeno, para una piel más firme y revitalizada.',
      },
      {
        name: 'Fototerapia LED',
        description:
          'Luz roja y azul dirigida para calmar la piel, unificar el tono y potenciar una luminosidad saludable.',
      },
      {
        name: 'Microdermoabrasión con Punta de Diamante',
        description:
          'Exfoliación suave con punta de diamante que retira las células muertas y afina la textura para una piel más lisa y luminosa.',
      },
      {
        name: 'Terapia Galvánica Frío-Calor Zemits',
        description:
          'Una fase caliente prepara la piel para absorber los principios activos, y la fase fría calma, descongestiona y tensa.',
      },
      {
        name: 'Microneedling',
        description:
          'Microestimulación que favorece la renovación natural de la piel y ayuda a que los sérums penetren para una piel más firme y afinada.',
      },
      {
        name: 'Zemits Sonosilk — Espátula Ultrasónica',
        description:
          'Vibraciones ultrasónicas para una limpieza profunda y delicada que elimina impurezas y células muertas.',
      },
      {
        name: 'Guantes de Microcorriente Zemits Elastistrom',
        description:
          'Microcorriente de baja intensidad que tonifica y eleva los músculos faciales para un contorno más firme y definido.',
      },
      {
        name: 'Alta Frecuencia',
        description:
          'Una suave corriente de alta frecuencia que purifica, ayuda a calmar la piel con imperfecciones y activa la circulación para una piel radiante.',
      },
    ],
  },
  products: {
    eyebrow: 'Con Qué Trabajamos',
    title: 'Marcas en las que Confiamos',
    subtitle:
      'Líneas de cosmética profesional que combinamos para conseguir los mejores resultados para tu piel.',
    visit: 'Visitar sitio',
    items: [
      {
        name: 'Omorovicza',
        description:
          'Cosmética de lujo húngara basada en aguas termales curativas ricas en minerales.',
        url: 'https://www.omorovicza.eu/',
      },
      {
        name: 'Mesoestetic',
        description:
          'Cosmecéuticos profesionales españoles para un cuidado de la piel avanzado y con resultados.',
        url: 'https://www.mesoestetic.es/',
      },
      {
        name: 'Esthemax',
        description:
          'Cosmética profesional conocida por sus mascarillas hydrojelly nutritivas y sus tratamientos activos.',
        url: 'https://esthemaxeuropa.com/',
      },
    ],
  },
  contactPage: {
    eyebrow: 'Visítanos',
    title: 'Contacto y Horario',
    getInTouch: 'Ponte en contacto',
    address: 'Dirección',
    whatsapp: 'WhatsApp',
    email: 'Correo',
    openingHours: 'Horario de apertura',
    closed: 'Cerrado',
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
  },
  booking: {
    eyebrow: 'Reserva',
    title: 'Reserva tu cita',
    stepTreatment: 'Tratamiento',
    stepPractitioner: 'Especialista',
    stepTime: 'Fecha y hora',
    stepDetails: 'Tus datos',
    chooseTreatment: 'Elige tu facial',
    chooseFocus: 'Elige un tratamiento focalizado',
    chooseIndiba: 'Elige una opción INDIBA',
    from: 'desde',
    noTreatments: 'No hay tratamientos disponibles para reservar en este momento.',
    choosePractitioner: 'Elige una especialista',
    forService: 'Para',
    anyAvailable: 'Cualquiera disponible',
    fastest: 'Disponibilidad más rápida',
    pickDateTime: 'Elige fecha y hora',
    anyPractitioner: 'Cualquier especialista',
    date: 'Fecha',
    findTimes: 'Buscar horarios',
    finding: 'Buscando…',
    noTimes: 'No hay horarios disponibles esta fecha. Prueba otro día.',
    selectDatePrompt: 'Selecciona una fecha para ver los horarios disponibles.',
    slotAvailable: 'Disponible',
    slotBooked: 'Reservado',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    back: 'Atrás',
    yourDetails: 'Tus datos',
    fullName: 'Nombre completo',
    email: 'Correo',
    phone: 'Teléfono',
    notes: '¿Algo que debamos saber? (opcional)',
    confirm: 'Confirmar reserva',
    booking: 'Reservando…',
    booked: 'Tu cita está reservada',
    with: 'con',
    at: 'a las',
    confirmationPrefix: 'Recibirás una confirmación en ',
    confirmationSuffix: '. Te esperamos con mucho gusto.',
    addToCalendar: 'Añadir al calendario',
    bookAnother: 'Reservar otra',
    provideDetails: 'Por favor indica tu nombre, correo y teléfono.',
  },
  lang: {
    switchToSpanish: 'Ver en español',
    switchToEnglish: 'View in English',
  },
  reviews: {
    sectionEyebrow: 'Lo Que Dicen Nuestros Clientes',
    sectionTitle: 'Opiniones',
    empty: 'Sé el primero en compartir tu experiencia.',
    leaveReview: 'Deja tu opinión',
    yourRating: 'Tu valoración',
    comment: 'Tu comentario (opcional)',
    submit: 'Enviar opinión',
    submitting: 'Enviando…',
    thanks: '¡Gracias por tu opinión!',
    reviewed: 'Valorado',
    cancel: 'Cancelar',
  },
  giftCards: {
    eyebrow: 'Regala Bienestar',
    title: 'Tarjetas Regalo',
    subtitle: 'Un tratamiento que les encantará, enviado por correo.',
    amount: 'Importe',
    custom: 'Importe personalizado',
    yourName: 'Tu nombre',
    yourEmail: 'Tu correo',
    recipientName: 'Nombre del destinatario (opcional)',
    recipientEmail: 'Correo del destinatario (opcional)',
    recipientHint: 'Deja el destinatario en blanco para recibir la tarjeta tú.',
    message: 'Mensaje (opcional)',
    continue: 'Continuar al pago',
    processing: 'Redirigiendo…',
    unavailable: 'Las tarjetas regalo online estarán disponibles pronto. Contáctanos para adquirir una.',
    successTitle: '¡Gracias!',
    successBody: 'Tu tarjeta regalo está en camino por correo.',
    backHome: 'Volver al inicio',
  },
  blog: {
    eyebrow: 'Diario',
    title: 'Diario de Belleza',
    subtitle: 'Consejos, tratamientos y novedades del estudio.',
    empty: 'Nuestras primeras historias llegarán pronto.',
    readMore: 'Leer más',
    back: 'Todos los artículos',
  },
};

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
