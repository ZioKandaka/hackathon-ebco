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
    description: 'Generate or show a spatial POI density heatmap visualization for a business type, category, or region.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        region: { type: FunctionDeclarationSchemaType.STRING, description: 'Target region, regency, or city name' },
        businessType: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional business type (e.g. minimarket, coffee_shop)' },
        customCategory: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional custom POI category filter (e.g. preschool, school, hospital)' },
        maxRating: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional maximum rating threshold for filtering POIs (e.g. 4.0)' },
      },
      required: ['region'],
    },
  },
  {
    name: 'catchment_score',
    description: 'Calculate composite catchment score (0-100) and 6 sub-scores for a user saved business location within a radius.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        locationNameOrId: { type: FunctionDeclarationSchemaType.STRING, description: 'Name or ID of the user saved location branch' },
        radiusKm: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Optional analysis radius in kilometers (default 2.0; max 10.0)' },
        ignoreCompetition: { type: FunctionDeclarationSchemaType.BOOLEAN, description: 'Optional flag to ignore competition density penalty in scoring' },
        ignoreSaturation: { type: FunctionDeclarationSchemaType.BOOLEAN, description: 'Optional flag to ignore network saturation penalty in scoring' },
      },
      required: ['locationNameOrId'],
    },
  },
  {
    name: 'accessibility_analysis',
    description: 'Evaluate a location catchment using real road network travel time (isochrone) for driving, walking, or transit.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        locationNameOrId: { type: FunctionDeclarationSchemaType.STRING, description: 'Name or ID of the user saved location branch or candidate spot' },
        travelMode: { type: FunctionDeclarationSchemaType.STRING, description: 'Travel mode: drive, walk, or transit (default drive)' },
        timeMinutes: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Travel time threshold in minutes (default 10; max 30)' },
      },
      required: ['locationNameOrId'],
    },
  },
  {
    name: 'ai_site_visit',
    description: 'Perform a qualitative visual inspection of a location using 4-heading Street View static imagery and satellite snapshot.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        locationNameOrId: { type: FunctionDeclarationSchemaType.STRING, description: 'Name or ID of the user saved location branch or candidate spot' },
      },
      required: ['locationNameOrId'],
    },
  },
];
