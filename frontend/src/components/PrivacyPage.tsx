import type { ReactElement } from "react"
import { LegalDocumentPage } from "./LegalDocumentPage"

export default function PrivacyPage(): ReactElement {
  return <LegalDocumentPage title="Privacy Policy" documentPath="/legal/privacy.html" />
}
