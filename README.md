# ORCA

This is a fork-and-improve of <https://github.com/nbremer/ORCA>.
It is currently configured to show the [STAC](https://stacspec.org/) ecosystem.

## Development

Get [uv](https://docs.astral.sh/uv/getting-started/installation/).
Then:

```shell
git clone git@github.com:nbremer/ORCA.git
cd ORCA
uv sync
```

Add or modify a ecosystem to [config.toml](./config.toml).
Then:

```shell
uv run python orca.py
```

This will write a bunch of config information to `data`.
This will take a while.

If you've added a new ecosystem, modify [orca.js](./orca.js) to point to your data directory.
Then:

```shell
uv run python -m http.server
```

The visualization should load at <http://localhost:8000>.
