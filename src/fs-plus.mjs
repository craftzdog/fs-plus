import fs from "fs";
import Module from "module";
import path from "path";
import { mkdirp } from "mkdirp";

/**
 * Useful extensions to node's built-in fs module.
 *
 * Important, this extends Node's builtin ['fs' module](http://nodejs.org/api/fs.html),
 * which means that you can do anything that you can do with Node's 'fs' module
 * plus a few extra functions that we've found to be helpful.
 */
const fsPlus = {
  __esModule: false,

  rimraf: null,

  loadRimRaf() {
    if (!this.rimraf) {
      return import("rimraf").then((rimraf) => (this.rimraf = rimraf));
    }
    return Promise.resolve(this.rimraf);
  },

  getHomeDirectory() {
    if (process.platform === "win32" && !process.env.HOME) {
      return process.env.USERPROFILE;
    } else {
      return process.env.HOME;
    }
  },

  /**
   * Make the given path absolute by resolving it against the current
   * working directory.
   *
   * @param {string} relativePath - The relative path. If the path is
   *   prefixed with '~', it will be expanded to the current user's
   *   home directory.
   * @returns {string} The absolute path or the relative path if it's unable to
   *   determine its real path.
   */
  absolute(relativePath) {
    if (relativePath == null) {
      return null;
    }

    relativePath = fsPlus.resolveHome(relativePath);

    try {
      return fs.realpathSync(relativePath);
    } catch (e) {
      return relativePath;
    }
  },

  /**
   * Normalize the given path treating a leading `~` segment as referring
   * to the home directory. This method does not query the filesystem.
   *
   * @param {string} pathToNormalize - The abnormal path. If the path is
   *   prefixed with '~', it will be expanded to the current user's
   *   home directory.
   * @returns {string} A normalized path.
   */
  normalize(pathToNormalize) {
    if (pathToNormalize == null) {
      return null;
    }

    return fsPlus.resolveHome(path.normalize(pathToNormalize.toString()));
  },

  resolveHome(relativePath) {
    if (relativePath === "~") {
      return fsPlus.getHomeDirectory();
    } else if (relativePath.indexOf(`~${path.sep}`) === 0) {
      return `${fsPlus.getHomeDirectory()}${relativePath.substring(1)}`;
    }
    return relativePath;
  },

  /**
   * Convert an absolute path to tilde path for Linux and macOS.
   * /Users/username/dev => ~/dev
   *
   * @param {string} pathToTildify - The full path.
   * @returns {string} A tildified path.
   */
  tildify(pathToTildify) {
    if (process.platform === "win32") {
      return pathToTildify;
    }

    const normalized = fsPlus.normalize(pathToTildify);
    const homeDir = fsPlus.getHomeDirectory();
    if (homeDir == null) {
      return pathToTildify;
    }

    if (normalized === homeDir) {
      return "~";
    }
    if (!normalized.startsWith(path.join(homeDir, path.sep))) {
      return pathToTildify;
    }

    return path.join("~", path.sep, normalized.substring(homeDir.length + 1));
  },

  /**
   * Get path to store application specific data.
   *
   * - Mac: ~/Library/Application Support/
   * - Win: %AppData%
   * - Linux: /var/lib
   *
   * @returns {string|null} The absolute path or null if platform isn't supported.
   */
  getAppDataDirectory() {
    switch (process.platform) {
      case "darwin":
        return fsPlus.absolute(
          path.join("~", "Library", "Application Support")
        );
      case "linux":
        return "/var/lib";
      case "win32":
        return process.env.APPDATA;
      default:
        return null;
    }
  },

  /**
   * Is the given path absolute?
   *
   * @param {string} pathToCheck - The relative or absolute path to check.
   * @returns {boolean} True if the path is absolute, false otherwise.
   */
  isAbsolute(pathToCheck = "") {
    if (pathToCheck == null) {
      pathToCheck = "";
    }
    if (process.platform === "win32") {
      if (pathToCheck[1] === ":") {
        return true;
      } // C:\ style
      if (pathToCheck[0] === "\\" && pathToCheck[1] === "\\") {
        return true;
      } // \\server\share style
    } else {
      return pathToCheck[0] === "/"; // /usr style
    }

    return false;
  },

  /**
   * Returns true if a file or folder at the specified path exists.
   *
   * @param {string} pathToCheck
   * @returns {boolean}
   */
  existsSync(pathToCheck) {
    return (
      isPathValid(pathToCheck) && statSyncNoException(pathToCheck) !== false
    );
  },

  /**
   * Returns true if the given path exists and is a directory.
   *
   * @param {string} directoryPath
   * @returns {boolean}
   */
  isDirectorySync(directoryPath) {
    if (!isPathValid(directoryPath)) {
      return false;
    }
    const stat = statSyncNoException(directoryPath);
    if (stat) {
      return stat.isDirectory();
    } else {
      return false;
    }
  },

  /**
   * Asynchronously checks that the given path exists and is a directory.
   *
   * @param {string} directoryPath
   * @param {function(boolean): void} done
   */
  isDirectory(directoryPath, done) {
    if (!isPathValid(directoryPath)) {
      return done(false);
    }
    return fs.stat(directoryPath, function (error, stat) {
      if (error != null) {
        return done(false);
      } else {
        return done(stat.isDirectory());
      }
    });
  },

  /**
   * Returns true if the specified path exists and is a file.
   *
   * @param {string} filePath
   * @returns {boolean}
   */
  isFileSync(filePath) {
    if (!isPathValid(filePath)) {
      return false;
    }
    const stat = statSyncNoException(filePath);
    if (stat) {
      return stat.isFile();
    } else {
      return false;
    }
  },

  /**
   * Returns true if the specified path is a symbolic link.
   *
   * @param {string} symlinkPath
   * @returns {boolean}
   */
  isSymbolicLinkSync(symlinkPath) {
    if (!isPathValid(symlinkPath)) {
      return false;
    }
    const stat = lstatSyncNoException(symlinkPath);
    if (stat) {
      return stat.isSymbolicLink();
    } else {
      return false;
    }
  },

  /**
   * Calls back with true if the specified path is a symbolic link.
   *
   * @param {string} symlinkPath
   * @param {function(boolean): void} callback
   */
  isSymbolicLink(symlinkPath, callback) {
    if (isPathValid(symlinkPath)) {
      return fs.lstat(symlinkPath, (error, stat) =>
        callback?.(stat != null && stat.isSymbolicLink())
      );
    } else {
      return process.nextTick(() => callback?.(false));
    }
  },

  /**
   * Returns true if the specified path is executable.
   *
   * @param {string} pathToCheck
   * @returns {boolean}
   */
  isExecutableSync(pathToCheck) {
    let stat;
    if (!isPathValid(pathToCheck)) {
      return false;
    }
    if ((stat = statSyncNoException(pathToCheck))) {
      return (stat.mode & 0o777 & 1) !== 0;
    } else {
      return false;
    }
  },

  /**
   * Returns the size of the specified path.
   *
   * @param {string} pathToCheck
   * @returns {number}
   */
  getSizeSync(pathToCheck) {
    if (isPathValid(pathToCheck)) {
      return statSyncNoException(pathToCheck).size ?? -1;
    } else {
      return -1;
    }
  },

  /**
   * Returns an Array with the paths of the files and directories
   * contained within the directory path. It is not recursive.
   *
   * @param {string} rootPath - The absolute path to the directory to list.
   * @param {string[]} [extensions] - Extensions to filter the results by.
   *   If none are given, none are filtered.
   * @returns {string[]}
   */
  listSync(rootPath, extensions) {
    if (!fsPlus.isDirectorySync(rootPath)) {
      return [];
    }
    let paths = fs.readdirSync(rootPath);
    if (extensions) {
      paths = fsPlus.filterExtensions(paths, extensions);
    }
    paths = paths.sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    paths = paths.map((childPath) => path.join(rootPath, childPath));
    return paths;
  },

  /**
   * Asynchronously lists the files and directories in the given path.
   * The listing is not recursive.
   *
   * @param {string} rootPath - The absolute path to the directory to list.
   * @param {string[]} [extensions] - Extensions to filter the results by.
   *   If none are given, none are filtered.
   * @param {function} callback - The function to call.
   */
  list(rootPath, ...rest) {
    let extensions;
    if (rest.length > 1) {
      extensions = rest.shift();
    }
    const done = rest.shift();
    return fs.readdir(rootPath, (error, paths) => {
      if (error != null) {
        return done(error);
      } else {
        if (extensions) {
          paths = fsPlus.filterExtensions(paths, extensions);
        }
        paths = paths.sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        );
        paths = paths.map((childPath) => path.join(rootPath, childPath));
        return done(null, paths);
      }
    });
  },

  /**
   * Returns only the paths which end with one of the given extensions.
   *
   * @param {string[]} paths
   * @param {string[]} extensions
   * @returns {string[]}
   */
  filterExtensions(paths, extensions) {
    extensions = extensions.map((ext) => {
      if (ext === "") {
        return ext;
      } else {
        return "." + ext.replace(/^\./, "");
      }
    });
    return paths.filter((pathToCheck) =>
      extensions.includes(path.extname(pathToCheck))
    );
  },

  /**
   * Get all paths under the given path.
   *
   * @param {string} rootPath - The path to start at.
   * @returns {string[]}
   */
  listTreeSync(rootPath) {
    const paths = [];
    const onPath = (childPath) => {
      paths.push(childPath);
      return true;
    };
    fsPlus.traverseTreeSync(rootPath, onPath, onPath);
    return paths;
  },

  /**
   * Moves the source file or directory to the target asynchronously.
   *
   * @param {string} source
   * @param {string} target
   * @param {function} callback
   */
  move(source, target, callback) {
    return isMoveTargetValid(
      source,
      target,
      (isMoveTargetValidErr, isTargetValid) => {
        if (isMoveTargetValidErr) {
          callback(isMoveTargetValidErr);
          return;
        }

        if (!isTargetValid) {
          const error = new Error(`'${target}' already exists.`);
          error.code = "EEXIST";
          callback(error);
          return;
        }

        const targetParentPath = path.dirname(target);
        return fs.exists(targetParentPath, (targetParentExists) => {
          if (targetParentExists) {
            fs.rename(source, target, callback);
            return;
          }

          return fsPlus.makeTree(targetParentPath, (makeTreeErr) => {
            if (makeTreeErr) {
              callback(makeTreeErr);
              return;
            }

            fs.rename(source, target, callback);
          });
        });
      }
    );
  },

  /**
   * Moves the source file or directory to the target synchronously.
   *
   * @param {string} source
   * @param {string} target
   */
  moveSync(source, target) {
    if (!isMoveTargetValidSync(source, target)) {
      const error = new Error(`'${target}' already exists.`);
      error.code = "EEXIST";
      throw error;
    }

    const targetParentPath = path.dirname(target);
    if (!fs.existsSync(targetParentPath)) {
      fsPlus.makeTreeSync(targetParentPath);
    }
    fs.renameSync(source, target);
  },

  /**
   * Removes the file or directory at the given path synchronously.
   *
   * @param {string} pathToRemove
   */
  removeSync(pathToRemove) {
    if (!this.rimraf)
      throw new Error(
        "RimRaf is not loaded. You have to call `fs.loadRimRaf()` beforehand."
      );
    return this.rimraf.rimrafSync(pathToRemove);
  },

  /**
   * Removes the file or directory at the given path asynchronously.
   *
   * @param {string} pathToRemove
   * @param {function} callback
   */
  remove(pathToRemove, callback) {
    return this.loadRimRaf()
      .then(({ rimraf }) => rimraf(pathToRemove))
      .then(callback, (error) => callback(error));
  },

  /**
   * Open, write, flush, and close a file, writing the given content
   * synchronously. It also creates the necessary parent directories.
   *
   * @param {string} filePath
   * @param {string|Buffer} content
   * @param {object} [options]
   */
  writeFileSync(filePath, content, options) {
    mkdirp.sync(path.dirname(filePath));
    fs.writeFileSync(filePath, content, options);
  },

  /**
   * Open, write, flush, and close a file, writing the given content
   * asynchronously. It also creates the necessary parent directories.
   *
   * @param {string} filePath
   * @param {string|Buffer} content
   * @param {object} [options]
   * @param {function} callback
   */
  writeFile(filePath, content, options, callback) {
    callback = arguments[arguments.length - 1];
    mkdirp(path.dirname(filePath)).then(
      () => {
        fs.writeFile(filePath, content, options, callback);
      },
      (error) => {
        callback?.(error);
      }
    );
  },

  /**
   * Copies the given path asynchronously.
   *
   * @param {string} sourcePath
   * @param {string} destinationPath
   * @param {function} done
   */
  copy(sourcePath, destinationPath, done) {
    mkdirp(path.dirname(destinationPath)).then(
      () => {
        const sourceStream = fs.createReadStream(sourcePath);
        sourceStream.on("error", (error) => {
          done?.(error);
          return (done = null);
        });

        const destinationStream = fs.createWriteStream(destinationPath);
        destinationStream.on("error", (error) => {
          done?.(error);
          return (done = null);
        });
        destinationStream.on("close", () => {
          done?.();
          return (done = null);
        });

        return sourceStream.pipe(destinationStream);
      },
      (error) => {
        done?.(error);
      }
    );
  },

  /**
   * Copies the given path recursively and synchronously.
   *
   * @param {string} sourcePath
   * @param {string} destinationPath
   */
  copySync(sourcePath, destinationPath) {
    // We need to save the sources before creaing the new directory to avoid
    // infinitely creating copies of the directory when copying inside itself
    const sources = fs.readdirSync(sourcePath);
    mkdirp.sync(destinationPath);
    for (let source of sources) {
      const sourceFilePath = path.join(sourcePath, source);
      const destinationFilePath = path.join(destinationPath, source);

      if (fsPlus.isDirectorySync(sourceFilePath)) {
        fsPlus.copySync(sourceFilePath, destinationFilePath);
      } else {
        fsPlus.copyFileSync(sourceFilePath, destinationFilePath);
      }
    }
  },

  /**
   * Copies the given path synchronously, buffering reads and writes to
   * keep memory footprint to a minimum. If the destination directory doesn't
   * exist, it creates it.
   *
   * @param {string} sourceFilePath - The file path you want to copy.
   * @param {string} destinationFilePath - The file path where the file will be copied.
   * @param {number} [bufferSize=16384] - The size in bytes of the buffer
   *   when reading from and writing to disk.
   */
  copyFileSync(sourceFilePath, destinationFilePath, bufferSize) {
    if (bufferSize == null) {
      bufferSize = 16 * 1024;
    }
    mkdirp.sync(path.dirname(destinationFilePath));

    let readFd = null;
    let writeFd = null;
    try {
      readFd = fs.openSync(sourceFilePath, "r");
      writeFd = fs.openSync(destinationFilePath, "w");
      let bytesRead = 1;
      let position = 0;
      while (bytesRead > 0) {
        const buffer = Buffer.alloc(bufferSize);
        bytesRead = fs.readSync(readFd, buffer, 0, buffer.length, position);
        fs.writeSync(writeFd, buffer, 0, bytesRead, position);
        position += bytesRead;
      }
    } finally {
      if (readFd != null) {
        fs.closeSync(readFd);
      }
      if (writeFd != null) {
        fs.closeSync(writeFd);
      }
    }
  },

  /**
   * Create a directory at the specified path including any missing
   * parent directories synchronously.
   *
   * @param {string} directoryPath
   */
  makeTreeSync(directoryPath) {
    if (!fsPlus.isDirectorySync(directoryPath)) {
      mkdirp.sync(directoryPath);
    }
  },

  /**
   * Create a directory at the specified path including any missing
   * parent directories asynchronously.
   *
   * @param {string} directoryPath
   * @param {function} [callback]
   */
  makeTree(directoryPath, callback) {
    fsPlus.isDirectory(directoryPath, (exists) => {
      if (exists) {
        return callback?.();
      }
      mkdirp(directoryPath).then(
        () => callback?.(null),
        (error) => callback?.(error)
      );
    });
  },

  /**
   * Recursively walk the given path and execute the given functions
   * synchronously.
   *
   * @param {string} rootPath - The directory to recurse into.
   * @param {function(string): void} onFile - The function to execute on each file,
   *   receives the absolute path.
   * @param {function(string): boolean} [onDirectory=onFile] - The function to execute
   *   on each directory, receives the absolute path. If this function returns
   *   a falsy value then the directory is not entered.
   */
  traverseTreeSync(rootPath, onFile, onDirectory) {
    if (onDirectory == null) {
      onDirectory = onFile;
    }
    if (!fsPlus.isDirectorySync(rootPath)) {
      return;
    }

    const traverse = function (directoryPath, onFile, onDirectory) {
      for (let file of fs.readdirSync(directoryPath)) {
        const childPath = path.join(directoryPath, file);
        let stats = fs.lstatSync(childPath);
        if (stats.isSymbolicLink()) {
          const linkStats = statSyncNoException(childPath);
          if (linkStats) {
            stats = linkStats;
          }
        }
        if (stats.isDirectory()) {
          if (onDirectory(childPath)) {
            traverse(childPath, onFile, onDirectory);
          }
        } else if (stats.isFile()) {
          onFile(childPath);
        }
      }

      return undefined;
    };

    return traverse(rootPath, onFile, onDirectory);
  },

  /**
   * Recursively walk the given path and execute the given functions
   * asynchronously.
   *
   * @param {string} rootPath - The directory to recurse into.
   * @param {function(string): void} onFile - The function to execute on each file,
   *   receives the absolute path.
   * @param {function(string): boolean} onDirectory - The function to execute on each
   *   directory, receives the absolute path.
   * @param {function} [onDone] - Called when traversal is complete.
   */
  traverseTree(rootPath, onFile, onDirectory, onDone) {
    const processChild = (childPath, callback) => {
      fs.stat(childPath, (error, stats) => {
        if (error) {
          return callback();
        } else if (stats.isFile()) {
          onFile(childPath);
          return callback();
        } else if (stats.isDirectory()) {
          if (onDirectory(childPath)) {
            return fs.readdir(childPath, (error, files) => {
              if (error) {
                return callback();
              }
              return processChildren(
                files.map((file) => path.join(childPath, file)),
                callback
              );
            });
          } else {
            return callback();
          }
        } else {
          return callback();
        }
      });
    };

    const processChildren = (children, callback) => {
      let i = 0;
      const next = () => {
        if (i >= children.length) {
          return callback();
        }
        processChild(children[i++], next);
      };
      next();
    };

    return fs.readdir(rootPath, (error, files) => {
      if (error) {
        return onDone?.();
      }
      processChildren(
        files.map((file) => path.join(rootPath, file)),
        () => onDone?.()
      );
    });
  },

  /**
   * Hashes the contents of the given file.
   *
   * @param {string} pathToDigest - The absolute path.
   * @returns {string} The MD5 hexadecimal hash.
   */
  md5ForPath(pathToDigest) {
    const contents = fs.readFileSync(pathToDigest);
    return require("crypto").createHash("md5").update(contents).digest("hex");
  },

  /**
   * Finds a relative path among the given array of paths.
   *
   * @param {...string} loadPaths - Absolute and relative paths to search.
   * @param {string} pathToResolve - The path to resolve.
   * @param {string[]} [extensions] - Extensions to pass to {@link resolveExtension},
   *   in which case pathToResolve should not contain an extension.
   * @returns {string|undefined} The absolute path of the file if found,
   *   undefined otherwise.
   */
  resolve(...args) {
    let extensions;
    if (Array.isArray(args.at(-1))) {
      extensions = args.pop();
    }
    const pathToResolve = args.pop()?.toString();
    const loadPaths = args;

    if (!pathToResolve) {
      return undefined;
    }

    let resolvedPath;
    if (fsPlus.isAbsolute(pathToResolve)) {
      if (
        extensions &&
        (resolvedPath = fsPlus.resolveExtension(pathToResolve, extensions))
      ) {
        return resolvedPath;
      } else {
        if (fsPlus.existsSync(pathToResolve)) {
          return pathToResolve;
        }
      }
    }

    for (let loadPath of Array.from(loadPaths)) {
      const candidatePath = path.join(loadPath, pathToResolve);
      if (extensions) {
        resolvedPath = fsPlus.resolveExtension(candidatePath, extensions);
        if (resolvedPath) {
          return resolvedPath;
        }
      } else {
        if (fsPlus.existsSync(candidatePath)) {
          return fsPlus.absolute(candidatePath);
        }
      }
    }
    return undefined;
  },

  /**
   * Like {@link resolve} but uses node's module paths as the load paths to search.
   *
   * @param {...*} args
   * @returns {string|undefined}
   */
  resolveOnLoadPath(...args) {
    let modulePaths = null;
    if (module.paths != null) {
      modulePaths = module.paths;
    } else if (process.resourcesPath) {
      modulePaths = [path.join(process.resourcesPath, "app", "node_modules")];
    } else {
      modulePaths = [];
    }

    const loadPaths = Module.globalPaths.concat(modulePaths);
    return fsPlus.resolve(...loadPaths, ...args);
  },

  /**
   * Finds the first file in the given path which matches the extension
   * in the order given.
   *
   * @param {string} pathToResolve - The relative or absolute path of the
   *   file in question without the extension or '.'.
   * @param {string[]} extensions - The ordered extensions to try.
   * @returns {string|undefined} The absolute path of the file if it exists
   *   with any of the given extensions, undefined otherwise.
   */
  resolveExtension(pathToResolve, extensions) {
    for (let extension of Array.from(extensions)) {
      if (extension === "") {
        if (fsPlus.existsSync(pathToResolve)) {
          return fsPlus.absolute(pathToResolve);
        }
      } else {
        const pathWithExtension =
          pathToResolve + "." + extension.replace(/^\./, "");
        if (fsPlus.existsSync(pathWithExtension)) {
          return fsPlus.absolute(pathWithExtension);
        }
      }
    }
    return undefined;
  },

  /**
   * Returns true for extensions associated with compressed files.
   *
   * @param {string} ext
   * @returns {boolean}
   */
  isCompressedExtension(ext) {
    if (ext == null) {
      return false;
    }
    return COMPRESSED_EXTENSIONS.hasOwnProperty(ext.toLowerCase());
  },

  /**
   * Returns true for extensions associated with image files.
   *
   * @param {string} ext
   * @returns {boolean}
   */
  isImageExtension(ext) {
    if (ext == null) {
      return false;
    }
    return IMAGE_EXTENSIONS.hasOwnProperty(ext.toLowerCase());
  },

  /**
   * Returns true for extensions associated with pdf files.
   *
   * @param {string} ext
   * @returns {boolean}
   */
  isPdfExtension(ext) {
    return ext?.toLowerCase() === ".pdf";
  },

  /**
   * Returns true for extensions associated with binary files.
   *
   * @param {string} ext
   * @returns {boolean}
   */
  isBinaryExtension(ext) {
    if (ext == null) {
      return false;
    }
    return BINARY_EXTENSIONS.hasOwnProperty(ext.toLowerCase());
  },

  /**
   * Returns true for files named similarly to 'README'.
   *
   * @param {string} readmePath
   * @returns {boolean}
   */
  isReadmePath(readmePath) {
    const extension = path.extname(readmePath);
    const base = path.basename(readmePath, extension).toLowerCase();
    return (
      base === "readme" &&
      (extension === "" || fsPlus.isMarkdownExtension(extension))
    );
  },

  /**
   * Returns true for extensions associated with Markdown files.
   *
   * @param {string} ext
   * @returns {boolean}
   */
  isMarkdownExtension(ext) {
    if (ext == null) {
      return false;
    }
    return MARKDOWN_EXTENSIONS.hasOwnProperty(ext.toLowerCase());
  },

  /**
   * Is the filesystem case insensitive?
   *
   * @returns {boolean} True if case insensitive, false otherwise.
   */
  isCaseInsensitive() {
    if (fsPlus.caseInsensitiveFs == null) {
      const lowerCaseStat = statSyncNoException(process.execPath.toLowerCase());
      const upperCaseStat = statSyncNoException(process.execPath.toUpperCase());
      if (lowerCaseStat && upperCaseStat) {
        fsPlus.caseInsensitiveFs =
          lowerCaseStat.dev === upperCaseStat.dev &&
          lowerCaseStat.ino === upperCaseStat.ino;
      } else {
        fsPlus.caseInsensitiveFs = false;
      }
    }

    return fsPlus.caseInsensitiveFs;
  },

  /**
   * Is the filesystem case sensitive?
   *
   * @returns {boolean} True if case sensitive, false otherwise.
   */
  isCaseSensitive() {
    return !fsPlus.isCaseInsensitive();
  },

  /**
   * Calls `fs.statSync`, catching all exceptions raised. This method calls
   * `fs.statSyncNoException` when provided by the underlying `fs` module
   * (Electron < 3.0).
   *
   * @param {...*} args
   * @returns {fs.Stats|false} The stats if the file exists, false otherwise.
   */
  statSyncNoException(...args) {
    return statSyncNoException(...args);
  },

  /**
   * Calls `fs.lstatSync`, catching all exceptions raised. This method calls
   * `fs.lstatSyncNoException` when provided by the underlying `fs` module
   * (Electron < 3.0).
   *
   * @param {...*} args
   * @returns {fs.Stats|false} The stats if the file exists, false otherwise.
   */
  lstatSyncNoException(...args) {
    return lstatSyncNoException(...args);
  },
};

// Built-in [l]statSyncNoException methods are only provided in Electron releases
// before 3.0.  We delay the version check until first request so that Electron
// application snapshots can be generated successfully.
let isElectron2OrLower = null;
const checkIfElectron2OrLower = function () {
  if (isElectron2OrLower === null) {
    isElectron2OrLower =
      process.versions.electron &&
      parseInt(process.versions.electron.split(".")[0]) <= 2;
  }
  return isElectron2OrLower;
};

let statSyncNoException = function (...args) {
  if (fs.statSyncNoException && checkIfElectron2OrLower()) {
    return fs.statSyncNoException(...args);
  } else {
    try {
      return fs.statSync(...args);
    } catch (error) {
      return false;
    }
  }
};

let lstatSyncNoException = function (...args) {
  if (fs.lstatSyncNoException && checkIfElectron2OrLower()) {
    return fs.lstatSyncNoException(...args);
  } else {
    try {
      return fs.lstatSync(...args);
    } catch (error) {
      return false;
    }
  }
};

const BINARY_EXTENSIONS = {
  ".ds_store": true,
  ".a": true,
  ".exe": true,
  ".o": true,
  ".pyc": true,
  ".pyo": true,
  ".so": true,
  ".woff": true,
};

const COMPRESSED_EXTENSIONS = {
  ".bz2": true,
  ".egg": true,
  ".epub": true,
  ".gem": true,
  ".gz": true,
  ".jar": true,
  ".lz": true,
  ".lzma": true,
  ".lzo": true,
  ".rar": true,
  ".tar": true,
  ".tgz": true,
  ".war": true,
  ".whl": true,
  ".xpi": true,
  ".xz": true,
  ".z": true,
  ".zip": true,
};

const IMAGE_EXTENSIONS = {
  ".gif": true,
  ".ico": true,
  ".jpeg": true,
  ".jpg": true,
  ".png": true,
  ".tif": true,
  ".tiff": true,
  ".webp": true,
};

const MARKDOWN_EXTENSIONS = {
  ".markdown": true,
  ".md": true,
  ".mdown": true,
  ".mkd": true,
  ".mkdown": true,
  ".rmd": true,
  ".ron": true,
};

let isPathValid = function (pathToCheck) {
  return (
    pathToCheck != null &&
    typeof pathToCheck === "string" &&
    pathToCheck.length > 0
  );
};

let isMoveTargetValid = function (source, target, callback) {
  return fs.stat(source, (oldErr, oldStat) => {
    if (oldErr) {
      callback(oldErr);
      return;
    }

    return fs.stat(target, (newErr, newStat) => {
      if (newErr && newErr.code === "ENOENT") {
        callback(undefined, true); // new path does not exist so it is valid
        return;
      }

      // New path exists so check if it points to the same file as the initial
      // path to see if the case of the file name is being changed on a case
      // insensitive filesystem.
      return callback(
        undefined,
        source.toLowerCase() === target.toLowerCase() &&
          oldStat.dev === newStat.dev &&
          oldStat.ino === newStat.ino
      );
    });
  });
};

let isMoveTargetValidSync = function (source, target) {
  const oldStat = statSyncNoException(source);
  const newStat = statSyncNoException(target);

  if (!oldStat || !newStat) {
    return true;
  }

  // New path exists so check if it points to the same file as the initial
  // path to see if the case of the file name is being changed on a case
  // insensitive filesystem.
  return (
    source.toLowerCase() === target.toLowerCase() &&
    oldStat.dev === newStat.dev &&
    oldStat.ino === newStat.ino
  );
};

module.exports = new Proxy(
  {},
  {
    get(target, key) {
      if (fsPlus.hasOwnProperty(key)) {
        return fsPlus[key];
      } else {
        return fs[key];
      }
    },

    set(target, key, value) {
      return (fsPlus[key] = value);
    },
  }
);
