const SLUG = "pystac";
const REPOSITORY_FULL = "stac-utils/pystac";

const FONT_FAMILY = "Atkinson Hyperlegible";
document.fonts.load(`normal 400 10px "${FONT_FAMILY}"`);
document.fonts.load(`italic 400 10px "${FONT_FAMILY}"`);
document.fonts.load(`normal 700 10px "${FONT_FAMILY}"`);
document.fonts.load(`italic 700 10px "${FONT_FAMILY}"`);

const container = document.getElementById("chart-container");
let width = container.offsetWidth;
let height = width - 400;
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
