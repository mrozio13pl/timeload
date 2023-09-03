# timeload

> Simply get the load time of your locally installed modules.

<img src="https://raw.githubusercontent.com/mrozio13pl/timeload/main/assets/preview.png" width="50%" height="50%" alt="preview">

## Install

Locally

```bash
$ npm i --save-dev timeload
```

or globally

```bash
$ npm i -g timeload
```

## Usage

Run this command in your current working directory:

```bash
$ timeload [options]
```

Basic example:

```bash
$ timeload

unwin        | 241µs |  7.03%
nice-try     | 266µs |  7.75%
has-flag     | 280µs |  8.15%
text-table   | 367µs | 10.67%
picocolors   | 536µs | 15.57%
pretty-ms    | 562µs | 16.33%
clear-module | 1ms   | 34.51%
Performed 5 runs.

Average load time: 3ms 443µs 960ns
Total load time: 17ms 219µs 800ns
```

## Options

### `--runs [number]`

Determine how many times should all modules be loaded to better estimate their average load time. Default is set to **5** runs.

### `--dev`

If set, it will also include `devDependencies` from your `package.json` and attempt loading them as well. Default is `false`.

### `--esm` (experimental)

If set, it will attempt to load all modules using dynamic [import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import). By default each module will be loaded using `require` unless it is an esm module.

## License

MIT
