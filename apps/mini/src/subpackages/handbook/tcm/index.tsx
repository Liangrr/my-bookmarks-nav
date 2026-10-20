import SectionBrowser, { type HandbookSection } from "../common";
import data from "@shared-data/tcm-guide.json";

const sections = (data as unknown as { sections: HandbookSection[] }).sections;

export default function Tcm() {
  return <SectionBrowser sections={sections} title="中医养生手册" />;
}
