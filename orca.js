const SLUG = "stac";
const REPOSITORY_FULL = "radiantearth/stac-spec";

const container = document.getElementById("chart-container");
let width = container.offsetWidth;
let height = width;
let ORCAVisual = createORCAVisual(container)
  .width(width)
  .height(height)
  .repository(REPOSITORY_FULL);

let promises = [];
promises.push(d3.csv(`data/${SLUG}/top_contributors.csv`));
promises.push(d3.csv(`data/${SLUG}/repositories.csv`));
promises.push(d3.csv(`data/${SLUG}/links.csv`));

Promise.all(promises).then((values) => {
  ORCAVisual(values);
});
