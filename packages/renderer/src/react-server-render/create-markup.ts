import { isUnitlessNumber } from './css-property'

const uppercasePattern = /([A-Z])/g
const msPattern = /^ms-/

function dangerousStyleValue(name: string, value: any, isCustomProperty: boolean) {
  // Note that we've removed escapeTextForBrowser() calls here since the
  // whole string will be escaped when the attribute is injected into
  // the markup. If you provide unsafe user data here they can inject
  // arbitrary CSS which may be problematic (I couldn't repro this):
  // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
  // http://www.thespanner.co.uk/2007/11/26/ultimate-xss-css-injection/
  // This is not an XSS hole but instead a potential CSS injection issue
  // which has lead to a greater discussion about how we're going to
  // trust URLs moving forward. See #2115901

  const isEmpty = value == null || typeof value === 'boolean' || value === ''
  if (isEmpty) {
    return ''
  }

  if (
    !isCustomProperty &&
    typeof value === 'number' &&
    value !== 0 &&
    !(isUnitlessNumber.hasOwnProperty(name) && isUnitlessNumber[name])
  ) {
    return value + 'px' // Presumes implicit 'px' suffix for unitless numbers
  }

  return ('' + value).trim()
}

export default function hyphenateStyleName(name: string): string {
  return name
    .replace(uppercasePattern, '-$1')
    .toLowerCase()
    .replace(msPattern, '-ms-')
}

const styleNameCache: Record<string, string> = {}
const processStyleName = function(styleName: string) {
  if (styleNameCache.hasOwnProperty(styleName)) {
    return styleNameCache[styleName]
  }
  const result = hyphenateStyleName(styleName)
  styleNameCache[styleName] = result
  return result
}

export function createMarkupForStyles(styles: Record<string, any>): string | null {
  let serialized = ''
  let delimiter = ''
  for (const styleName in styles) {
    if (!styles.hasOwnProperty(styleName)) {
      continue
    }
    const isCustomProperty = styleName.indexOf('--') === 0
    const styleValue = styles[styleName]
    if (styleValue != null) {
      serialized += delimiter + (isCustomProperty ? styleName : processStyleName(styleName)) + ':'
      serialized += dangerousStyleValue(styleName, styleValue, isCustomProperty)

      delimiter = ';'
    }
  }
  return serialized || null
}

// export function createMarkupForProperty(name: string, value: any): string {
// }
