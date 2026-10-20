import TrackGuide from "../TrackGuide";
import data from "@shared-data/flutter-learning-guide.json";

const d = data as unknown as {
  meta: { title: string; desc: string; updated: string };
  tracks: Parameters<typeof TrackGuide>[0]["tracks"];
  glossary: Parameters<typeof TrackGuide>[0]["glossary"];
};

export default function FlutterLearn() {
  return <TrackGuide meta={d.meta} tracks={d.tracks} glossary={d.glossary} />;
}
