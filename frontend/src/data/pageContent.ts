import pagesJson from "./content/pages.json"

export const pagesContent = pagesJson
export const billingContent = pagesContent.billing
export const footerContent = pagesContent.footer
export const legalPageContent = pagesContent.legal
export const homePageContent = pagesContent.home
export const aboutPageContent = pagesContent.about
export const helpCenterContent = pagesContent.helpCenter
export const proUpgradeContent = pagesContent.proUpgrade
export const dashboardPageContent = pagesContent.dashboard
export const profilePageContent = pagesContent.profile
export const changelogContent = pagesContent.changelog

export type BillingDisabledCopy = typeof billingContent.disabledCopy
export type AboutComingSoonItem = typeof aboutPageContent.comingSoonItems[number]
export type ChangelogRelease = typeof changelogContent.releases[number]
export type ChangelogGeneralChangeType = ChangelogRelease["general"][number]["type"]
export type ChangelogEngineeringChangeType = ChangelogRelease["engineering"][number]["type"]

export function interpolateContent(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}
