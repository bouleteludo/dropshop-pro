#!/usr/bin/env node
// Writes the five theme styles (presets) of the Lanterne theme:
//   - config/settings_data.json (colors, fonts and layout of each style)
//   - templates/*.json and sections/*-group.json (base content, Lanterne style)
//   - listings/<style>/ (home page, header and footer of the other styles)
//
// Run after changing a style:  node shopify/scripts/generate-presets.mjs
// Default content is in English (the Theme Store default locale); merchants
// edit it in the theme editor. French storefront strings live in locales/.

import fs from 'node:fs';
import path from 'node:path';

const THEME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../theme');

const HEADER = `/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
`;

function write(relative, data) {
  const file = path.join(THEME, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${HEADER}${JSON.stringify(data, null, 2)}\n`);
}

const scheme = (background, text, accent, button, buttonLabel, secondaryButtonLabel) => ({
  settings: {
    background,
    background_gradient: '',
    text,
    accent,
    button,
    button_label: buttonLabel,
    secondary_button_label: secondaryButtonLabel,
  },
});

// Each style targets a merchant segment, as the Theme Store requires.
// The first style carries the theme name and uses the root templates.
const STYLES = {
  Lanterne: {
    slug: 'lanterne',
    segment: 'Costumes and party supplies',
    fonts: ['marcellus_n4', 'inter_n4'],
    headingScale: 105,
    letterSpacing: 2,
    schemes: {
      'scheme-1': scheme('#08090B', '#F6F1EA', '#E8A978', '#C1651F', '#08090B', '#F6F1EA'),
      'scheme-2': scheme('#131518', '#F6F1EA', '#E8A978', '#C1651F', '#08090B', '#F6F1EA'),
      'scheme-3': scheme('#2C1C47', '#F6F1EA', '#F0C29E', '#C1651F', '#08090B', '#F6F1EA'),
      'scheme-4': scheme('#F6F1EA', '#17191C', '#8A4511', '#17191C', '#F6F1EA', '#17191C'),
    },
    banner: {
      color_scheme: 'scheme-1',
      artwork: 'halloween',
      artwork_alt: 'Gothic shop front decorated for Halloween with carved pumpkins and lanterns under a full moon',
      effect: 'embers',
      content_position: 'left',
      overlay_style: 'left',
      overlay_opacity: 80,
      mobile_image_position: '75% center',
      subheading: 'Halloween collection — limited edition',
      heading: 'A night',
      heading_accent: 'to remember.',
      text: '<p>Lanterns, pumpkins and a full moon: costumes and decorations for a dark, elegant and truly memorable Halloween.</p>',
    },
    announcement: 'Halloween edition — new costumes and decorations every week',
    featuredLabel: 'Featured costume',
    collectionSubheading: 'The Halloween collection',
    collectionHeading: 'Selected pieces',
    story: 'Costumes, masks and decorations chosen for their character, their quality and the memories they create.',
    newsletter: ['Get Halloween news first', '<p>New arrivals, costume ideas and subscriber-only offers.</p>'],
    highlight: ['star', 'For every party', '<p>Costumes and accessories for kids and adults.</p>'],
  },
  Sapin: {
    slug: 'sapin',
    segment: 'Christmas decorations and gifts',
    fonts: ['playfair_display_n6', 'inter_n4'],
    headingScale: 100,
    letterSpacing: 0,
    schemes: {
      'scheme-1': scheme('#021D14', '#FFFAF0', '#F3D47A', '#B31325', '#FFFFFF', '#FFFAF0'),
      'scheme-2': scheme('#073421', '#FFFAF0', '#F3D47A', '#B31325', '#FFFFFF', '#FFFAF0'),
      'scheme-3': scheme('#9E1020', '#FFF4CF', '#FFF4CF', '#021D14', '#FFFAF0', '#FFF4CF'),
      'scheme-4': scheme('#FFFAF0', '#021D14', '#9E1020', '#B31325', '#FFFFFF', '#021D14'),
    },
    banner: {
      color_scheme: 'scheme-1',
      artwork: 'noel',
      artwork_alt: 'Snowy shop front decorated for Christmas with a sleigh in the night sky',
      effect: 'snow',
      content_position: 'right',
      overlay_style: 'right',
      overlay_opacity: 80,
      mobile_image_position: '25% center',
      subheading: 'Christmas collection — seasonal edition',
      heading: 'The magic of Christmas',
      heading_accent: 'starts here.',
      text: '<p>Gifts, golden lights and a snowy village atmosphere: a selection designed to make every celebration feel special.</p>',
    },
    announcement: 'Christmas edition — gifts, decorations and golden light',
    featuredLabel: 'Gift idea',
    collectionSubheading: 'Under the tree',
    collectionHeading: 'The Christmas selection',
    story: 'A festive shop built around gifting: decorations, lights and presents chosen to make the season shine.',
    newsletter: ['Get our Christmas gift ideas', '<p>Gift guides, new arrivals and subscriber-only offers.</p>'],
    highlight: ['gift', 'Gift-ready', '<p>Add a personal gift message to your order.</p>'],
  },
  Printemps: {
    slug: 'printemps',
    segment: 'Flowers and spring decorations',
    fonts: ['cormorant_n6', 'dm_sans_n4'],
    headingScale: 115,
    letterSpacing: 0,
    schemes: {
      'scheme-1': scheme('#F5F0E4', '#243126', '#4F5E3B', '#4F5E3B', '#FFFAF0', '#243126'),
      'scheme-2': scheme('#273228', '#FFFAF0', '#E8D79D', '#C8B37A', '#243126', '#FFFAF0'),
      'scheme-3': scheme('#435032', '#FFF7DC', '#FFF7DC', '#FFFAF0', '#243126', '#FFF7DC'),
      'scheme-4': scheme('#FFFDF7', '#243126', '#4F5E3B', '#4F5E3B', '#FFFAF0', '#243126'),
    },
    banner: {
      color_scheme: 'scheme-2',
      artwork: 'paques',
      artwork_alt: 'Flower-filled shop front decorated for Easter with painted eggs and tulips',
      effect: 'petals',
      content_position: 'left',
      overlay_style: 'left',
      overlay_opacity: 70,
      mobile_image_position: '75% center',
      subheading: 'Easter collection — spring edition',
      heading: 'A gentle Easter',
      heading_accent: 'in full bloom.',
      text: '<p>Ivory, moss green and antique gold: a bright selection of flowers, decorations and refined spring gifts.</p>',
    },
    announcement: 'Spring edition — fresh flowers and Easter decorations',
    featuredLabel: 'Easter favorite',
    collectionSubheading: 'Spring selection',
    collectionHeading: 'The Easter collection',
    story: 'Flowers, decorations and gifts chosen to bring the light and softness of spring into every home.',
    newsletter: ['Get spring news first', '<p>New arrivals, decorating ideas and subscriber-only offers.</p>'],
    highlight: ['leaf', 'Seasonal picks', '<p>New spring arrivals every week.</p>'],
  },
  Velours: {
    slug: 'velours',
    segment: 'Jewelry and romantic gifts',
    fonts: ['bodoni_moda_n5', 'inter_n4'],
    headingScale: 100,
    letterSpacing: 0,
    schemes: {
      'scheme-1': scheme('#21050C', '#FFF4EF', '#F0B9AA', '#A30F2D', '#FFFFFF', '#FFF4EF'),
      'scheme-2': scheme('#340812', '#FFF4EF', '#F0B9AA', '#A30F2D', '#FFFFFF', '#FFF4EF'),
      'scheme-3': scheme('#8E0D27', '#FFE5DC', '#FFE5DC', '#21050C', '#FFF4EF', '#FFE5DC'),
      'scheme-4': scheme('#FFF4EF', '#21050C', '#8E0D27', '#A30F2D', '#FFFFFF', '#21050C'),
    },
    banner: {
      color_scheme: 'scheme-1',
      artwork: 'valentin',
      artwork_alt: 'Shop window for Valentine’s Day with red roses, candles and gift boxes',
      effect: 'petals',
      content_position: 'left',
      overlay_style: 'left',
      overlay_opacity: 80,
      mobile_image_position: '75% center',
      subheading: 'Valentine’s Day collection — romantic edition',
      heading: 'Thoughtful gifts',
      heading_accent: 'that truly matter.',
      text: '<p>Deep red, roses, candles and precious details: jewelry and gifts for an elegant, intimate and memorable moment.</p>',
    },
    announcement: 'Valentine’s Day edition — jewelry, roses and warm light',
    featuredLabel: 'Gift idea',
    collectionSubheading: 'Made to be given',
    collectionHeading: 'The Valentine’s Day selection',
    story: 'Jewelry and romantic gifts chosen for their elegance, their emotion and the moments they celebrate.',
    newsletter: ['Get our gift ideas for two', '<p>New arrivals, romantic picks and subscriber-only offers.</p>'],
    highlight: ['heart', 'Made to be given', '<p>Add a personal gift message to your order.</p>'],
  },
  Rivage: {
    slug: 'rivage',
    segment: 'Beach and summer accessories',
    fonts: ['fraunces_n6', 'work_sans_n4'],
    headingScale: 100,
    letterSpacing: 0,
    schemes: {
      'scheme-1': scheme('#082031', '#FFF6EA', '#F5D98B', '#D89137', '#08273A', '#FFF6EA'),
      'scheme-2': scheme('#103247', '#FFF6EA', '#F5D98B', '#D89137', '#08273A', '#FFF6EA'),
      'scheme-3': scheme('#0C4661', '#FFF6E3', '#F5D98B', '#D89137', '#08273A', '#FFF6E3'),
      'scheme-4': scheme('#FFF6EA', '#082031', '#0C4661', '#0C4661', '#FFF6EA', '#082031'),
    },
    banner: {
      color_scheme: 'scheme-1',
      artwork: 'ete',
      artwork_alt: 'Summer table by the sea at sunset with a straw hat, shells and tropical flowers',
      effect: 'sparkles',
      content_position: 'left',
      overlay_style: 'left',
      overlay_opacity: 80,
      mobile_image_position: '75% center',
      subheading: 'Summer collection — sunny edition',
      heading: 'Summer',
      heading_accent: 'has arrived.',
      text: '<p>Warm sand, deep teal and golden light: beach essentials and summer accessories for long sunny days.</p>',
    },
    announcement: 'Summer edition — golden hour, warm sand and sunlight',
    featuredLabel: 'Summer pick',
    collectionSubheading: 'Summer essentials',
    collectionHeading: 'The summer collection',
    story: 'Beach essentials and summer accessories chosen for sunny days, holidays and seaside escapes.',
    newsletter: ['Get summer news first', '<p>New arrivals, holiday picks and subscriber-only offers.</p>'],
    highlight: ['sun', 'Summer ready', '<p>Fresh picks for sunny days.</p>'],
  },
};
const PARENT = 'Lanterne';

const block = (type, settings = {}) => ({ type, settings });

function indexTemplate(style) {
  const b = style.banner;
  const [icon, title, text] = style.highlight;
  return {
    sections: {
      banner: {
        type: 'seasonal-banner',
        blocks: {},
        block_order: [],
        settings: {
          height: 'large',
          content_position: b.content_position,
          overlay_style: b.overlay_style,
          overlay_opacity: b.overlay_opacity,
          image_position: 'center center',
          mobile_image_position: b.mobile_image_position,
          animate_image: true,
          color_scheme: b.color_scheme,
          image: '',
          artwork: b.artwork,
          artwork_alt: b.artwork_alt,
          effect: b.effect,
          subheading: b.subheading,
          heading: b.heading,
          heading_accent: b.heading_accent,
          text: b.text,
          button_label_1: 'Shop the collection',
          button_link_1: 'shopify://collections/all',
          button_label_2: '',
          button_link_2: '',
        },
      },
      highlights: {
        type: 'highlights',
        blocks: {
          secure: block('highlight', { icon: 'lock', title: 'Secure checkout', text: '<p>Pay safely with the payment methods you trust.</p>' }),
          delivery: block('highlight', { icon: 'truck', title: 'Tracked delivery', text: '<p>Follow your order until it reaches your door.</p>' }),
          season: block('highlight', { icon, title, text }),
        },
        block_order: ['secure', 'delivery', 'season'],
        settings: { color_scheme: 'scheme-2', heading: '', padding: 'small' },
      },
      featured_product: {
        type: 'featured-product',
        blocks: {
          label: block('text', { text: style.featuredLabel, style: 'eyebrow' }),
          title: block('title'),
          price: block('price'),
          variant_picker: block('variant_picker', { picker_type: 'buttons', show_swatches: true }),
          quantity: block('quantity_selector'),
          buy_buttons: block('buy_buttons', { show_dynamic_checkout: true, show_gift_card_recipient: true }),
          description: block('description'),
        },
        block_order: ['label', 'title', 'price', 'variant_picker', 'quantity', 'buy_buttons', 'description'],
        settings: { product: '', color_scheme: 'scheme-1', padding: 'large' },
      },
      collection_list: {
        type: 'collection-list',
        blocks: Object.fromEntries([1, 2, 3, 4].map((i) => [`collection_${i}`, block('collection', { collection: '' })])),
        block_order: [1, 2, 3, 4].map((i) => `collection_${i}`),
        settings: { color_scheme: 'scheme-1', eyebrow: 'Explore', heading: 'Shop by category', columns: 4, show_count: true, show_view_all: true, padding: 'medium' },
      },
      featured_collection: {
        type: 'featured-collection',
        settings: {
          collection: 'all',
          color_scheme: 'scheme-1',
          eyebrow: style.collectionSubheading,
          heading: style.collectionHeading,
          description: '',
          product_count: 8,
          columns: 4,
          show_view_all: true,
          padding: 'large',
        },
      },
      gift_guide: {
        type: 'gift-guide',
        blocks: {
          budget_1: block('budget', { max_price: 25, title: '', text: 'Thoughtful little extras' }),
          budget_2: block('budget', { max_price: 50, title: '', text: 'Gifts they will love' }),
          budget_3: block('budget', { max_price: 100, title: '', text: 'Something special' }),
          budget_4: block('budget', { min_price: 100, title: '', text: 'The ultimate treat' }),
        },
        block_order: ['budget_1', 'budget_2', 'budget_3', 'budget_4'],
        settings: { collection: 'all', color_scheme: 'scheme-2', subheading: 'Gift guide', heading: 'Find a gift for every budget', text: '', padding: 'large' },
      },
      story: {
        type: 'rich-text',
        blocks: {
          heading: block('heading', { heading: 'Our story', size: 'h2' }),
          text: block('text', { text: `<p>${style.story}</p>` }),
        },
        block_order: ['heading', 'text'],
        settings: { color_scheme: 'scheme-1', alignment: 'center', padding: 'large' },
      },
    },
    order: ['banner', 'highlights', 'featured_product', 'collection_list', 'featured_collection', 'gift_guide', 'story'],
  };
}

function headerGroup(style) {
  return {
    type: 'header',
    name: 't:names.header_group',
    sections: {
      announcement_bar: {
        type: 'announcement-bar',
        blocks: { announcement: block('announcement', { text: style.announcement, link: '', schedule: false }) },
        block_order: ['announcement'],
        settings: { color_scheme: 'scheme-3', show_deadline: true },
      },
      header: {
        type: 'header',
        settings: { color_scheme: 'scheme-1', menu: 'main-menu', customer_account_menu: 'customer-account-main-menu', sticky: true, show_search: true },
      },
    },
    order: ['announcement_bar', 'header'],
  };
}

function footerGroup(style) {
  const [heading, text] = style.newsletter;
  return {
    type: 'footer',
    name: 't:names.footer_group',
    sections: {
      newsletter: { type: 'newsletter', settings: { color_scheme: 'scheme-2', heading, text, padding: 'medium' } },
      footer: {
        type: 'footer',
        blocks: {
          brand: block('brand', { show_logo: true, text: `<p>${style.story}</p>` }),
          menu: block('menu', { heading: 'Information', menu: 'footer' }),
          text: block('text', { heading: 'Customer care', text: '<p>Questions about an order? Visit our contact page and our team will be happy to help.</p>' }),
        },
        block_order: ['brand', 'menu', 'text'],
        settings: {
          color_scheme: 'scheme-2',
          enable_country_selector: true,
          enable_language_selector: true,
          show_payment_icons: true,
          show_policies: true,
          show_follow_on_shop: true,
          show_powered_by: true,
        },
      },
    },
    order: ['newsletter', 'footer'],
  };
}

const COMMON_TEMPLATES = {
  product: {
    sections: {
      main: {
        type: 'main-product',
        blocks: {
          title: block('title'),
          price: block('price'),
          variant_picker: block('variant_picker', { picker_type: 'buttons', show_swatches: true }),
          quantity: block('quantity_selector'),
          buy_buttons: block('buy_buttons', { show_dynamic_checkout: true, show_gift_card_recipient: true }),
          delivery_deadline: block('delivery_deadline'),
          description: block('description'),
          shipping: block('collapsible_tab', { heading: 'Shipping', icon: 'truck', content: '<p>Shipping rates and delivery times are shown at checkout, before you pay.</p>', page: '' }),
          returns: block('collapsible_tab', { heading: 'Returns', icon: 'return', content: '<p>See our refund policy for return conditions and timeframes.</p>', page: '' }),
          complementary: block('complementary', { heading: 'Pairs well with', product_count: 3 }),
        },
        block_order: ['title', 'price', 'variant_picker', 'quantity', 'buy_buttons', 'delivery_deadline', 'description', 'shipping', 'returns', 'complementary'],
        settings: { color_scheme: 'scheme-1', media_size: 'large', sticky_info: true },
      },
      related: { type: 'product-recommendations', settings: { color_scheme: 'scheme-1', heading: 'You may also like', product_count: 4, columns: 4 } },
    },
    order: ['main', 'related'],
  },
  collection: {
    sections: { main: { type: 'main-collection', settings: { color_scheme: 'scheme-1', show_description: true, show_image: true, products_per_page: 24, columns: 4, enable_filtering: true, enable_sorting: true } } },
    order: ['main'],
  },
  'list-collections': {
    sections: { main: { type: 'main-list-collections', settings: { color_scheme: 'scheme-1', title: 'Collections', sort: 'alphabetical', columns: 3 } } },
    order: ['main'],
  },
  search: {
    sections: { main: { type: 'main-search', settings: { color_scheme: 'scheme-1', enable_filtering: true, enable_sorting: true } } },
    order: ['main'],
  },
  cart: {
    sections: {
      main: { type: 'main-cart', settings: { color_scheme: 'scheme-1', show_note: true, show_gift_message: true, gift_message_limit: 250 } },
      featured_collection: {
        type: 'featured-collection',
        settings: { collection: 'all', color_scheme: 'scheme-2', eyebrow: '', heading: 'You may also like', description: '', product_count: 4, columns: 4, show_view_all: false, padding: 'medium' },
      },
    },
    order: ['main', 'featured_collection'],
  },
  page: { sections: { main: { type: 'main-page', settings: { color_scheme: 'scheme-1' } } }, order: ['main'] },
  'page.contact': {
    sections: {
      main: { type: 'main-page', settings: { color_scheme: 'scheme-1' } },
      form: { type: 'contact-form', settings: { color_scheme: 'scheme-1', heading: 'Send us a message' } },
    },
    order: ['main', 'form'],
  },
  blog: { sections: { main: { type: 'main-blog', settings: { color_scheme: 'scheme-1', show_author: false } } }, order: ['main'] },
  article: { sections: { main: { type: 'main-article', settings: { color_scheme: 'scheme-1', show_author: false } } }, order: ['main'] },
  404: { sections: { main: { type: 'main-404', settings: { color_scheme: 'scheme-1' } } }, order: ['main'] },
  password: {
    layout: 'password',
    sections: { main: { type: 'main-password', settings: { color_scheme: 'scheme-1', show_newsletter: true, newsletter_heading: 'Be the first to know when we open' } } },
    order: ['main'],
  },
};

function settingsFor(style) {
  const [headingFont, bodyFont] = style.fonts;
  return {
    logo: '',
    logo_width: 150,
    favicon: '',
    color_schemes: style.schemes,
    type_heading_font: headingFont,
    heading_scale: style.headingScale,
    heading_letter_spacing: style.letterSpacing,
    heading_uppercase: false,
    type_body_font: bodyFont,
    body_scale: 100,
    page_width: 1280,
    page_margin: 20,
    button_radius: 40,
    card_radius: 16,
    input_radius: 10,
    product_card_ratio: '1 / 1',
    card_show_second_image: true,
    card_show_vendor: false,
    // Off by default: the merchant confirms the real date before showing it.
    deadline_enable: false,
    deadline_month: '12',
    deadline_day: 20,
    deadline_days_before: 21,
    deadline_message: 'Order by [date] for delivery in time for the holidays.',
    social_facebook_link: '',
    social_instagram_link: '',
    social_tiktok_link: '',
    social_pinterest_link: '',
    social_youtube_link: '',
    social_twitter_link: '',
    social_snapchat_link: '',
  };
}

export { STYLES, PARENT };

export function generate() {
  const parent = STYLES[PARENT];
  for (const [name, data] of Object.entries(COMMON_TEMPLATES)) write(`templates/${name}.json`, data);
  write('templates/index.json', indexTemplate(parent));
  write('sections/header-group.json', headerGroup(parent));
  write('sections/footer-group.json', footerGroup(parent));

  fs.rmSync(path.join(THEME, 'listings'), { recursive: true, force: true });
  for (const [name, style] of Object.entries(STYLES)) {
    if (name === PARENT) continue;
    write(`listings/${style.slug}/templates/index.json`, indexTemplate(style));
    write(`listings/${style.slug}/sections/header-group.json`, headerGroup(style));
    write(`listings/${style.slug}/sections/footer-group.json`, footerGroup(style));
  }

  write('config/settings_data.json', {
    current: settingsFor(parent),
    presets: Object.fromEntries(Object.entries(STYLES).map(([name, style]) => [name, settingsFor(style)])),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  generate();
  console.log(`Generated ${Object.keys(STYLES).length} styles in ${path.relative(process.cwd(), THEME)}`);
}
