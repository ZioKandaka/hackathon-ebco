import { FunctionDeclaration, FunctionDeclarationSchemaType } from '@google-cloud/vertexai';

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'add_business',
    description: 'Register or add a new business branch location with business name, category type, and street address.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        businessName: { type: FunctionDeclarationSchemaType.STRING, description: 'Name of the business branch or spot' },
        businessType: { type: FunctionDeclarationSchemaType.STRING, description: 'Category or type of business (e.g. coffee_shop, minimarket, restaurant, bank)' },
        address: { type: FunctionDeclarationSchemaType.STRING, description: 'Full street address or landmark location' },
      },
      required: ['businessName', 'businessType', 'address'],
    },
  },
  {
    name: 'discover_locations',
    description: 'Find or discover top candidate location spots for a specific business type in a target region or city.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        businessType: { type: FunctionDeclarationSchemaType.STRING, description: 'Category or type of business to discover' },
        region: { type: FunctionDeclarationSchemaType.STRING, description: 'Target region, regency, or city name (e.g. Kediri, Bandung, Jakarta)' },
        count: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional maximum number of candidate spots to return (default 5)' },
      },
      required: ['businessType', 'region'],
    },
  },
  {
    name: 'generate_heatmap',
    description:
      'Show a POI density heatmap for a category of place within a radius of a location. The category is independent ' +
      'of the user\'s own saved business type — e.g. a food business can ask for a heatmap of schools. Only call this ' +
      'tool with a category when one is given OR the location resolves to the user\'s own saved business (then omit ' +
      'category to default to that business\'s type); if the location is a bare region/address with no category ' +
      'mentioned, do NOT call this tool — ask the user in plain text which category they want instead. ' +
      'Optional attribute filters may ONLY use these exact columns — if the user asks to filter on something else ' +
      '(e.g. revenue, profit, employee count), do NOT call this tool with an invented filter; ask a clarifying ' +
      'question or explain that attribute is not available: ' +
      'rating (number, e.g. "below 4.0"), user_rating_count (number, review count), ' +
      'business_status (one of OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY).',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        category: {
          type: FunctionDeclarationSchemaType.STRING,
          description:
            'Free-text POI category to show density for (e.g. "school", "coffee shop", "pharmacy"). Optional only ' +
            "when locationNameOrId resolves to the user's own saved business — defaults to that business's category.",
        },
        locationNameOrId: {
          type: FunctionDeclarationSchemaType.STRING,
          description:
            'Name/ID of a saved business location or candidate spot to center the heatmap on, OR a freeform region/city/address (e.g. "Bandung", "Jl. Sudirman Jakarta").',
        },
        latitude: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional explicit latitude coordinate to center on' },
        longitude: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional explicit longitude coordinate to center on' },
        radiusKm: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Radius in kilometers from the center point (default 5.0; max 20.0)' },
        filters: {
          type: FunctionDeclarationSchemaType.ARRAY,
          description: 'Optional attribute filters, restricted to the exact columns listed in this tool\'s description.',
          items: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              column: {
                type: FunctionDeclarationSchemaType.STRING,
                enum: ['rating', 'user_rating_count', 'business_status'],
              },
              operator: {
                type: FunctionDeclarationSchemaType.STRING,
                enum: ['lt', 'lte', 'gt', 'gte', 'eq', 'neq'],
              },
              value: { type: FunctionDeclarationSchemaType.STRING, description: 'Comparison value as a string, e.g. "4.0" or "OPERATIONAL"' },
            },
            required: ['column', 'operator', 'value'],
          },
        },
      },
    },
  },
  {
    name: 'catchment_score',
    description:
      'Calculate composite catchment score (0-100) and 6 sub-scores for a business category at a location — a ' +
      "saved business location, a candidate spot, or ANY freeform street address (e.g. a prospective new site the " +
      "user hasn't opened yet). The category is independent of any saved business's own type — e.g. the user can " +
      'ask for a "book store" catchment score at their existing coffee shop\'s address. Only call this tool with a ' +
      'category when one is given OR the location resolves to the user\'s own saved business (then omit category to ' +
      'default to that business\'s type); if the location is a bare address/candidate spot with no category ' +
      'mentioned, do NOT call this tool — ask the user in plain text which category they want instead. ' +
      'The catchment boundary can be a distance radius OR a real road-network travel-time isochrone — this is one ' +
      'unified scoring tool, not two. If the user gives neither, DEFAULT to boundaryType "time" with a 10-minute ' +
      'drive (do NOT default to radius). Use boundaryType "radius" ONLY when the user explicitly gives a distance ' +
      '(e.g. "within 2km", "500m radius"). If the user only wants to SEE the travel-time shape without a score ' +
      '(e.g. "show me the 10 minute drive boundary"), do NOT call catchment_score — call show_travel_boundary instead. ' +
      'IMPORTANT for follow-ups: if the user\'s message only changes the category or the boundary (e.g. "what about ' +
      'a book store instead?" or "what about a 15 minute walk instead?") after a prior catchment_score call in this ' +
      'conversation, reuse the exact same location/address from that prior call — do not ask the user to repeat it. ' +
      'After calling this tool, respond with ONLY a short one-sentence pointer to the panel (e.g. "Catchment ' +
      'analysis for [category] at [location] is ready — see the panel on the left.") — do NOT restate the ' +
      'individual scores, weights, or explanations in chat, since the panel already displays the full breakdown.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        category: {
          type: FunctionDeclarationSchemaType.STRING,
          description:
            'Free-text business category to analyze catchment for (e.g. "coffee shop", "book store"). Optional ' +
            "only when locationNameOrId resolves to the user's own saved business — defaults to that business's category.",
        },
        locationNameOrId: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional name or ID of a saved location or candidate spot' },
        latitude: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional explicit latitude coordinate of candidate or site' },
        longitude: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional explicit longitude coordinate of candidate or site' },
        address: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional freeform street address to analyze on the fly — works for ANY address, not just saved businesses' },
        boundaryType: {
          type: FunctionDeclarationSchemaType.STRING,
          enum: ['radius', 'time'],
          description: 'Boundary shape for the analysis. Defaults to "time" (10-minute drive) when omitted — only set to "radius" when the user explicitly names a distance.',
        },
        radiusKm: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Distance radius in kilometers — only used when boundaryType is "radius" (default 2.0; max 10.0)' },
        travelMode: { type: FunctionDeclarationSchemaType.STRING, enum: ['drive', 'walk', 'transit'], description: 'Travel mode — only used when boundaryType is "time" (default drive)' },
        timeMinutes: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Travel time threshold in minutes — only used when boundaryType is "time" (default 10; max 30; user-customizable, e.g. "20 minutes")' },
        ignoreCompetition: { type: FunctionDeclarationSchemaType.BOOLEAN, description: 'Optional flag to ignore competition density penalty in scoring' },
        ignoreSaturation: { type: FunctionDeclarationSchemaType.BOOLEAN, description: 'Optional flag to ignore network saturation penalty in scoring' },
      },
    },
  },
  {
    name: 'show_travel_boundary',
    description:
      'Show ONLY the travel-time boundary shape on the map for driving, walking, or transit — does NOT query POIs ' +
      'and does NOT run catchment scoring. Use this when the user just wants to see the shape (e.g. "show me the ' +
      '10 minute drive boundary from my branch", "what does a 15 minute walk look like from here"). If the user ' +
      'wants a score/analysis of the area, use catchment_score instead, not this tool.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        locationNameOrId: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional name or ID of a saved location or candidate spot' },
        latitude: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional explicit latitude coordinate of candidate or site' },
        longitude: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional explicit longitude coordinate of candidate or site' },
        address: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional freeform street address to analyze on the fly' },
        travelMode: { type: FunctionDeclarationSchemaType.STRING, enum: ['drive', 'walk', 'transit'], description: 'Travel mode (default drive)' },
        timeMinutes: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Travel time threshold in minutes (default 10; max 30)' },
      },
    },
  },
  {
    name: 'ai_site_visit',
    description: 'Perform an AI-scored visual inspection of a location using real Street View and satellite imagery. Results (images, per-criterion scores, and analysis) are saved to history and shown in the Site Visit panel — do NOT describe or list individual images in the chat reply, just briefly confirm the analysis is ready and point the user to the panel.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        locationNameOrId: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional name or ID of a saved location or candidate spot' },
        latitude: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional explicit latitude coordinate of candidate or site' },
        longitude: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional explicit longitude coordinate of candidate or site' },
        address: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional freeform street address to inspect' },
      },
    },
  },
];
