from __future__ import annotations

import csv
import datetime
from csv import DictWriter
from pathlib import Path
from typing import Iterator

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
    _contributors: list[NamedUser]
    _repo: GithubRepository

    @classmethod
    def from_repo(
        cls: type[Repository],
        repo: GithubRepository,
    ) -> Repository:
        contributors = list(repo.get_contributors())
        repo_total_commits = sum((c.contributions for c in contributors))
        repo_url = repo.homepage or f"https://github.com/{repo.full_name}"

        repository = Repository(
            repo=repo.full_name,
            repo_stars=repo.stargazers_count,
            repo_forks=repo.forks_count,
            repo_createdAt=repo.created_at,
            repo_updatedAt=repo.updated_at,
            repo_total_commits=repo_total_commits,
            repo_url=repo_url,
            repo_description=repo.description,
            repo_languages=",".join(repo.get_languages().keys()),
        )
        repository._contributors = contributors
        repository._repo = repo
        return repository

    def iter_links(self, config: Config) -> Iterator[Link]:
        for contributor in self._contributors:
            if author_name := config.contributors.get(contributor.login):
                print(f"Getting commits for {author_name} in {self.repo}")
                commits = list(self._repo.get_commits(author=contributor.login))
                yield Link(
                    author_name=author_name,
                    repo=self.repo,
                    commit_count=contributor.contributions,
                    commit_sec_min=int(commits[-1].commit.author.date.timestamp()),
                    commit_sec_max=int(commits[0].commit.author.date.timestamp()),
                )


class Link(BaseModel):
    author_name: str
    repo: str
    commit_count: int
    commit_sec_min: int
    commit_sec_max: int


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
            repository = Repository.from_repo(github.get_repo(repo_name))
            for link in repository.iter_links(config):
                top_contributors.add(link.author_name)
                links.append(link.model_dump())
            repositories.append(repository.model_dump())

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
            fieldnames = list(Link.model_json_schema()["properties"].keys())
            writer = DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(links)


if __name__ == "__main__":
    cli()
