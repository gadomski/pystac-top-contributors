from __future__ import annotations

import csv
import datetime
from csv import DictWriter
from pathlib import Path

import click
import tomllib
from github import Auth, Github
from github.NamedUser import NamedUser
from github.Repository import Repository as GithubRepository
from pydantic import BaseModel


class Config(BaseModel):
    ecosystems: dict[str, Ecosystem]
    contributors: dict[str, str]


class Ecosystem(BaseModel):
    repos: list[str]
    top_contributors: list[str]


class Repository(BaseModel):
    repo: str
    repo_stars: int
    repo_forks: int
    repo_createdAt: datetime.datetime
    repo_updatedAt: datetime.datetime
    repo_total_commits: int
    repo_url: str
    repo_description: str
    repo_languages: str

    @classmethod
    def from_repo(
        cls: type[Repository], repo: GithubRepository, contributors: list[NamedUser]
    ) -> Repository:
        repo_total_commits = sum((c.contributions for c in contributors))
        return Repository(
            repo=repo.full_name,
            repo_stars=repo.stargazers_count,
            repo_forks=repo.forks_count,
            repo_createdAt=repo.created_at,
            repo_updatedAt=repo.updated_at,
            repo_total_commits=repo_total_commits,
            repo_url=repo.homepage,
            repo_description=repo.description,
            repo_languages=",".join(repo.get_languages().keys()),
        )


@click.command
def cli() -> None:
    with open("config.toml", "rb") as f:
        d = tomllib.load(f)
    config = Config.model_validate(d)
    auth = Auth.NetrcAuth()
    github = Github(auth=auth)
    for name, ecosystem in config.ecosystems.items():
        directory = Path(__file__).parent / "data" / name
        directory.mkdir(exist_ok=True, parents=True)
        repositories = []
        top_contributors = set()
        links = []
        for repo_name in ecosystem.repos:
            print(f"Getting {repo_name}")
            repo = github.get_repo(repo_name)
            contributors = []
            for contributor in repo.get_contributors():
                contributors.append(contributor)
                if contributor_name := config.contributors.get(contributor.login):
                    if contributor.login in ecosystem.top_contributors:
                        top_contributors.add(contributor_name)
                    print(f"Getting commits for {contributor_name}")
                    commits = list(repo.get_commits(author=contributor.login))
                    if commits:
                        links.append(
                            [
                                contributor_name,
                                repo.full_name,
                                contributor.contributions,
                                commits[0].commit.author.date.timestamp(),
                                commits[-1].commit.author.date.timestamp(),
                            ]
                        )
            repositories.append(Repository.from_repo(repo, contributors).model_dump())
        with open(directory / "repositories.csv", "w") as f:
            fieldnames = list(Repository.model_json_schema()["properties"].keys())
            writer = DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(repositories)
        with open(directory / "top_contributors.csv", "w") as f:
            writer = csv.writer(f)
            writer.writerow(["author_name"])
            for name in top_contributors:
                writer.writerow([name])
        with open(directory / "links.csv", "w") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "author_name",
                    "repo",
                    "commit_count",
                    "commit_sec_min",
                    "commit_sec_max",
                ]
            )
            writer.writerows(links)


if __name__ == "__main__":
    cli()
