import { type ReferenceConfiguration } from '@scalar/api-reference'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { getJavaScriptFile } from './utils'

export type FastifyApiReferenceOptions = {
  /**
   * Prefix for the registered route
   *
   * @default '/'
   */
  routePrefix: string
  configuration?: ReferenceConfiguration
}

// This Schema is used to hide the route from the documentation.
// https://github.com/fastify/fastify-swagger#hide-a-route
const schemaToHideRoute = {
  hide: true,
}

/**
 * The Fastify custom theme CSS
 */
export const defaultCss = `
:root {
  --theme-font: 'Inter', var(--system-fonts);
}

.light-mode {
  color-scheme: light;
  --theme-color-1: #1c1e21;
  --theme-color-2: #757575;
  --theme-color-3: #8e8e8e;
  --theme-color-disabled: #b4b1b1;
  --theme-color-ghost: #a7a7a7;
  --theme-color-accent: #2f8555;
  --theme-background-1: #fff;
  --theme-background-2: #f5f5f5;
  --theme-background-3: #ededed;
  --theme-background-4: rgba(0, 0, 0, 0.06);
  --theme-background-accent: #2f85551f;

  --theme-border-color: rgba(0, 0, 0, 0.1);
  --theme-scrollbar-color: rgba(0, 0, 0, 0.18);
  --theme-scrollbar-color-active: rgba(0, 0, 0, 0.36);
  --theme-lifted-brightness: 1;
  --theme-backdrop-brightness: 1;

  --theme-shadow-1: 0 1px 3px 0 rgba(0, 0, 0, 0.11);
  --theme-shadow-2: rgba(0, 0, 0, 0.08) 0px 13px 20px 0px,
    rgba(0, 0, 0, 0.08) 0px 3px 8px 0px, #eeeeed 0px 0 0 1px;

  --theme-button-1: rgb(49 53 56);
  --theme-button-1-color: #fff;
  --theme-button-1-hover: rgb(28 31 33);

  --theme-color-green: #007300;
  --theme-color-red: #af272b;
  --theme-color-yellow: #b38200;
  --theme-color-blue: #3b8ba5;
  --theme-color-orange: #fb892c;
  --theme-color-purple: #5203d1;
}

.dark-mode {
  color-scheme: dark;
  --theme-color-1: rgba(255, 255, 255, 0.9);
  --theme-color-2: rgba(255, 255, 255, 0.62);
  --theme-color-3: rgba(255, 255, 255, 0.44);
  --theme-color-disabled: rgba(255, 255, 255, 0.34);
  --theme-color-ghost: rgba(255, 255, 255, 0.26);
  --theme-color-accent: #27c2a0;
  --theme-background-1: #1b1b1d;
  --theme-background-2: #242526;
  --theme-background-3: #3b3b3b;
  --theme-background-4: rgba(255, 255, 255, 0.06);
  --theme-background-accent: #27c2a01f;

  --theme-border-color: rgba(255, 255, 255, 0.1);
  --theme-scrollbar-color: rgba(255, 255, 255, 0.24);
  --theme-scrollbar-color-active: rgba(255, 255, 255, 0.48);
  --theme-lifted-brightness: 1.45;
  --theme-backdrop-brightness: 0.5;

  --theme-shadow-1: 0 1px 3px 0 rgb(0, 0, 0, 0.1);
  --theme-shadow-2: rgba(15, 15, 15, 0.2) 0px 3px 6px,
    rgba(15, 15, 15, 0.4) 0px 9px 24px, 0 0 0 1px rgba(255, 255, 255, 0.1);

  --theme-button-1: #f6f6f6;
  --theme-button-1-color: #000;
  --theme-button-1-hover: #e7e7e7;

  --theme-color-green: #26b226;
  --theme-color-red: #fb565b;
  --theme-color-yellow: #ffc426;
  --theme-color-blue: #6ecfef;
  --theme-color-orange: #ff8d4d;
  --theme-color-purple: #b191f9;
}
.scalar-card:nth-of-type(3) {
  display: none;
}
`

/**
 * The HTML to load the @scalar/api-reference JavaScript package.
 */
export const javascript = (configuration: ReferenceConfiguration) => {
  return `
    <script
      id="api-reference"
      type="application/json"
      data-configuration="${JSON.stringify(configuration)
        .split('"')
        .join('&quot;')}">${
        configuration.spec?.content
          ? typeof configuration.spec?.content === 'function'
            ? JSON.stringify(configuration.spec?.content())
            : JSON.stringify(configuration.spec?.content)
          : ''
      }</script>
      <script src="/@scalar/fastify-api-reference/browser.js"></script>
  `
}

/**
 * The HTML template to render the API Reference.
 */
export function htmlDocument(configuration: ReferenceConfiguration) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    ${javascript(configuration)}
  </body>
</html>
`
}

const fastifyApiReference: FastifyPluginAsync<
  FastifyApiReferenceOptions
> = async (fastify, options) => {
  let { configuration } = options
  const hasSwaggerPlugin = fastify.hasPlugin('@fastify/swagger')

  // If no spec is passed and @fastify/swagger isn’t loaded, show a warning.
  if (
    !configuration?.spec?.content &&
    !configuration?.spec?.url &&
    !hasSwaggerPlugin
  ) {
    console.warn(
      '[@scalar/fastify-api-reference] You didn’t provide a spec.content or spec.url and @fastify/swagger could not be find either. Please provide one of these options.',
    )

    return
  }

  // Read the JavaScript file once.
  const fileContent = getJavaScriptFile()

  // If no theme is passed, use the default theme.
  fastify.route({
    method: 'GET',
    url: options.routePrefix ?? '/',
    // We don’t know whether @fastify/swagger is registered, but it doesn’t hurt to add a schema anyway.
    // @ts-ignore
    schema: schemaToHideRoute,
    async handler(_, reply) {
      reply.header('Content-Type', 'text/html; charset=utf-8')

      // If nothing is passed, try to use @fastify/swagger
      if (
        !configuration?.spec?.content &&
        !configuration?.spec?.url &&
        hasSwaggerPlugin
      ) {
        configuration = {
          ...configuration,
          spec: {
            content: () => {
              // @ts-ignore
              return fastify.swagger()
            },
          },
        }
      }

      // Add the default CSS
      if (!configuration?.customCss && !configuration?.theme) {
        configuration = {
          ...configuration,
          customCss: defaultCss,
        }
      }

      const html = htmlDocument(configuration)

      reply.send(html)
    },
  })

  fastify.route({
    method: 'GET',
    url: '/@scalar/fastify-api-reference/browser.js',
    // We don’t know whether @fastify/swagger is registered, but it doesn’t hurt to add a schema anyway.
    // @ts-ignore
    schema: schemaToHideRoute,
    async handler(_, reply) {
      reply.header('Content-Type', 'application/javascript; charset=utf-8')
      reply.send(fileContent)
    },
  })
}

export default fp(fastifyApiReference)
