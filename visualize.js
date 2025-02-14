const FONT_FAMILY = "Atkinson Hyperlegible";
document.fonts.load(`normal 400 10px "${FONT_FAMILY}"`);
document.fonts.load(`italic 400 10px "${FONT_FAMILY}"`);
document.fonts.load(`normal 700 10px "${FONT_FAMILY}"`);
document.fonts.load(`italic 700 10px "${FONT_FAMILY}"`);
const REPOSITORY_FULL = "stac-utils/pystac";
const container = document.getElementById("chart-container");
let width = container.offsetWidth;
let height = width;
let ORCAVisual = createORCAVisual(container)
  .width(width)
  .height(height)
  .repository(REPOSITORY_FULL);
let promises = [];
promises.push(d3.csv(`data/stac/top_contributors.csv`));
promises.push(d3.csv(`data/stac/repositories.csv`));
promises.push(d3.csv(`data/stac/links.csv`));
Promise.all(promises).then((values) => {
  ORCAVisual(values);
});
