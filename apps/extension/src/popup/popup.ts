type View = "unpaired" | "confirm" | "ready";

const views: View[] = ["unpaired", "confirm", "ready"];

function show(view: View) {
  for (const name of views) {
    const el = document.getElementById(`view-${name}`);
    if (el) el.hidden = name !== view;
  }
}

show("unpaired");
