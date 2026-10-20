import SectionBrowser, { type HandbookSection } from "@/components/SectionBrowser";
import data from "@shared-data/survival-guide.json";

const sections = (data as unknown as { sections: HandbookSection[] }).sections;

export default function Survival() {
  return <SectionBrowser sections={sections} title="野外求生手册" />;
}
