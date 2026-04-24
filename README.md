# ip-ban-list-cli

CLI to manage and seed an `ip-ban-list`.

## Install

```bash
npm i -g ip-ban-list-cli
```

## Usage

```txt
ip-ban-list [command]

Commands:
  ban <ip>     Add an IP address to the ban list
  unban <ip>   Remove an IP address from the ban list
  id           Print the public key for the ban list
  seed         Seed the ban list over Hyperswarm
```

## API

Use `ip-ban-list --help` for more information, `ip-ban-list ban --help`, etc.

#### Storage

By default, it uses `~/.ip-ban-list/corestore`.

Set `--storage [path]` to use a different location.

#### Ban an IP address

```bash
ip-ban-list ban 203.0.113.10
```

#### Unban an IP address

```bash
ip-ban-list unban 203.0.113.10
```

#### Print the ban list key

```bash
ip-ban-list id
```

#### Seed a ban list

```bash
ip-ban-list seed
```

This announces the local ban list over Hyperswarm and prints the public key
other peers can use with the `ip-ban-list` API package.
