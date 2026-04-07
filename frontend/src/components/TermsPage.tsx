import type { ReactElement } from "react"
import { LegalDocumentPage } from "./LegalDocumentPage"

export default function TermsPage(): ReactElement {
  return <LegalDocumentPage title="Terms of Service" documentPath="/legal/terms.html" />
}
