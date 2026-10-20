import SectionBrowser, { type HandbookSection } from "../common";
import data from "@shared-data/emergency-guide.json";

const sections = (data as unknown as { sections: HandbookSection[] }).sections;

export default function Emergency() {
  return <SectionBrowser sections={sections} title="急救知识手册" />;
}
