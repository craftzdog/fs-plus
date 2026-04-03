const path = require("path");
const temp = require("temp");
const fs = require("../lib/fs-plus");

temp.track();

const fixturesDir = path.join(__dirname, "fixtures");
const sampleFile = path.join(fixturesDir, "sample.js");
const linkToSampleFile = path.join(fixturesDir, "link-to-sample.js");
try {
  fs.unlinkSync(linkToSampleFile);
} catch (error) {}
fs.symlinkSync(sampleFile, linkToSampleFile, "junction");

beforeAll(() => fs.loadRimRaf());

describe("fs", function () {
  describe(".isFileSync(path)", function () {
    it("returns true with a file path", () =>
      expect(fs.isFileSync(path.join(fixturesDir, "sample.js"))).toBe(true));

    it("returns false with a directory path", () =>
      expect(fs.isFileSync(fixturesDir)).toBe(false));

    it("returns false with a non-existent path", function () {
      expect(fs.isFileSync(path.join(fixturesDir, "non-existent"))).toBe(false);
      expect(fs.isFileSync(null)).toBe(false);
    });
  });

  describe(".isSymbolicLinkSync(path)", function () {
    it("returns true with a symbolic link path", () =>
      expect(fs.isSymbolicLinkSync(linkToSampleFile)).toBe(true));

    it("returns false with a file path", () =>
      expect(fs.isSymbolicLinkSync(sampleFile)).toBe(false));

    it("returns false with a non-existent path", function () {
      expect(
        fs.isSymbolicLinkSync(path.join(fixturesDir, "non-existent")),
      ).toBe(false);
      expect(fs.isSymbolicLinkSync("")).toBe(false);
      expect(fs.isSymbolicLinkSync(null)).toBe(false);
    });
  });

  describe(".isSymbolicLink(path, callback)", function () {
    it("calls back with true for a symbolic link path", (done) => {
      fs.isSymbolicLink(linkToSampleFile, (result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it("calls back with false for a file path", (done) => {
      fs.isSymbolicLink(sampleFile, (result) => {
        expect(result).toBe(false);
        done();
      });
    });

    it("calls back with false for a non-existent path", (done) => {
      fs.isSymbolicLink(path.join(fixturesDir, "non-existent"), (result) => {
        expect(result).toBe(false);

        fs.isSymbolicLink("", (result) => {
          expect(result).toBe(false);

          fs.isSymbolicLink(null, (result) => {
            expect(result).toBe(false);
            done();
          });
        });
      });
    });
  });

  describe(".existsSync(path)", function () {
    it("returns true when the path exists", () =>
      expect(fs.existsSync(fixturesDir)).toBe(true));

    it("returns false when the path doesn't exist", function () {
      expect(
        fs.existsSync(path.join(fixturesDir, "-nope-does-not-exist")),
      ).toBe(false);
      expect(fs.existsSync("")).toBe(false);
      expect(fs.existsSync(null)).toBe(false);
    });
  });

  describe(".remove(pathToRemove, callback)", function () {
    let tempDir = null;

    beforeEach(() => (tempDir = temp.mkdirSync("fs-plus-")));

    it("removes an existing file", (done) => {
      const filePath = path.join(tempDir, "existing-file");
      fs.writeFileSync(filePath, "");

      fs.remove(filePath, () => {
        expect(fs.existsSync(filePath)).toBe(false);
        done();
      });
    });

    it("does nothing for a non-existent file", (done) => {
      const filePath = path.join(tempDir, "non-existent-file");

      fs.remove(filePath, () => {
        expect(fs.existsSync(filePath)).toBe(false);
        done();
      });
    });

    it("removes a non-empty directory", (done) => {
      const directoryPath = path.join(tempDir, "subdir");
      fs.makeTreeSync(path.join(directoryPath, "subdir"));

      fs.remove(directoryPath, () => {
        expect(fs.existsSync(directoryPath)).toBe(false);
        done();
      });
    });
  });

  describe(".makeTreeSync(path)", function () {
    const aPath = path.join(temp.dir, "a");

    beforeEach(function () {
      if (fs.existsSync(aPath)) {
        fs.removeSync(aPath);
      }
    });

    it("creates all directories in path including any missing parent directories", function () {
      const abcPath = path.join(aPath, "b", "c");
      fs.makeTreeSync(abcPath);
      expect(fs.isDirectorySync(abcPath)).toBeTruthy();
    });

    it("throws an error when the provided path is a file", function () {
      const tempDir = temp.mkdirSync("fs-plus-");
      const filePath = path.join(tempDir, "file.txt");
      fs.writeFileSync(filePath, "");
      expect(fs.isFileSync(filePath)).toBe(true);

      let makeTreeError = null;

      try {
        fs.makeTreeSync(filePath);
      } catch (error) {
        makeTreeError = error;
      }

      expect(makeTreeError.code).toBe("EEXIST");
      expect(makeTreeError.path).toBe(filePath);
    });
  });

  describe(".makeTree(path)", function () {
    const aPath = path.join(temp.dir, "a");

    beforeEach(function () {
      if (fs.existsSync(aPath)) {
        fs.removeSync(aPath);
      }
    });

    it("creates all directories in path including any missing parent directories", (done) => {
      const abcPath = path.join(aPath, "b", "c");
      fs.makeTree(abcPath, (err) => {
        expect(err).toBeNull();
        expect(fs.isDirectorySync(abcPath)).toBeTruthy();

        fs.makeTree(abcPath, (err) => {
          expect(err).toBeUndefined();
          expect(fs.isDirectorySync(abcPath)).toBeTruthy();
          done();
        });
      });
    });

    it("calls back with an error when the provided path is a file", (done) => {
      const tempDir = temp.mkdirSync("fs-plus-");
      const filePath = path.join(tempDir, "file.txt");
      fs.writeFileSync(filePath, "");
      expect(fs.isFileSync(filePath)).toBe(true);

      fs.makeTree(filePath, (err) => {
        expect(err).toBeTruthy();
        expect(err.code).toBe("EEXIST");
        expect(err.path).toBe(filePath);
        done();
      });
    });
  });

  describe(".traverseTreeSync(path, onFile, onDirectory)", function () {
    it("calls fn for every path in the tree at the given path", function () {
      const paths = [];
      const onPath = function (childPath) {
        paths.push(childPath);
        return true;
      };
      expect(fs.traverseTreeSync(fixturesDir, onPath, onPath)).toBeUndefined();
      expect(paths).toEqual(fs.listTreeSync(fixturesDir));
    });

    it("does not recurse into a directory if it is pruned", function () {
      const paths = [];
      const onPath = function (childPath) {
        if (childPath.match(/\/dir$/)) {
          return false;
        } else {
          paths.push(childPath);
          return true;
        }
      };
      fs.traverseTreeSync(fixturesDir, onPath, onPath);

      expect(paths.length).toBeGreaterThan(0);
      paths.forEach((filePath) => expect(filePath).not.toMatch(/\/dir\//));
    });

    it("returns entries if path is a symlink", function () {
      const symlinkPath = path.join(fixturesDir, "symlink-to-dir");
      const symlinkPaths = [];
      const onSymlinkPath = (p) =>
        symlinkPaths.push(p.substring(symlinkPath.length + 1));

      const regularPath = path.join(fixturesDir, "dir");
      const paths = [];
      const onPath = (p) => paths.push(p.substring(regularPath.length + 1));

      fs.traverseTreeSync(symlinkPath, onSymlinkPath, onSymlinkPath);
      fs.traverseTreeSync(regularPath, onPath, onPath);

      expect(symlinkPaths).toEqual(paths);
    });

    it("ignores missing symlinks", function () {
      if (process.platform !== "win32") {
        const directory = temp.mkdirSync("symlink-in-here");
        const paths = [];
        const onPath = (childPath) => paths.push(childPath);
        fs.symlinkSync(
          path.join(directory, "source"),
          path.join(directory, "destination"),
        );
        fs.traverseTreeSync(directory, onPath);
        expect(paths.length).toBe(0);
      }
    });
  });

  describe(".traverseTree(path, onFile, onDirectory, onDone)", function () {
    it("calls fn for every path in the tree at the given path", (done) => {
      const paths = [];
      const onPath = function (childPath) {
        paths.push(childPath);
        return true;
      };
      fs.traverseTree(fixturesDir, onPath, onPath, () => {
        expect(paths).toEqual(fs.listTreeSync(fixturesDir));
        done();
      });
    });

    it("does not recurse into a directory if it is pruned", (done) => {
      const paths = [];
      const onPath = function (childPath) {
        if (childPath.match(/\/dir$/)) {
          return false;
        } else {
          paths.push(childPath);
          return true;
        }
      };

      fs.traverseTree(fixturesDir, onPath, onPath, () => {
        expect(paths.length).toBeGreaterThan(0);
        paths.forEach((filePath) => expect(filePath).not.toMatch(/\/dir\//));
        done();
      });
    });

    it("returns entries if path is a symlink", (done) => {
      const symlinkPath = path.join(fixturesDir, "symlink-to-dir");
      const symlinkPaths = [];
      const onSymlinkPath = (p) =>
        symlinkPaths.push(p.substring(symlinkPath.length + 1));

      const regularPath = path.join(fixturesDir, "dir");
      const paths = [];
      const onPath = (p) => paths.push(p.substring(regularPath.length + 1));

      let remaining = 2;
      const check = () => {
        remaining--;
        if (remaining === 0) {
          expect(symlinkPaths).toEqual(paths);
          done();
        }
      };

      fs.traverseTree(symlinkPath, onSymlinkPath, onSymlinkPath, check);
      fs.traverseTree(regularPath, onPath, onPath, check);
    });

    it("ignores missing symlinks", (done) => {
      const directory = temp.mkdirSync("symlink-in-here");
      const paths = [];
      const onPath = (childPath) => paths.push(childPath);
      fs.symlinkSync(
        path.join(directory, "source"),
        path.join(directory, "destination"),
      );
      fs.traverseTree(directory, onPath, onPath, () => {
        expect(paths.length).toBe(0);
        done();
      });
    });
  });

  describe(".md5ForPath(path)", () =>
    it("returns the MD5 hash of the file at the given path", () =>
      expect(fs.md5ForPath(require.resolve("./fixtures/binary-file.png"))).toBe(
        "cdaad7483b17865b5f00728d189e90eb",
      )));

  describe(".list(path, extensions)", function () {
    it("returns the absolute paths of entries within the given directory", function () {
      const paths = fs.listSync(fixturesDir);
      expect(paths).toContain(path.join(fixturesDir, "css.css"));
      expect(paths).toContain(path.join(fixturesDir, "coffee.coffee"));
      expect(paths).toContain(path.join(fixturesDir, "sample.txt"));
      expect(paths).toContain(path.join(fixturesDir, "sample.js"));
      expect(paths).toContain(path.join(fixturesDir, "binary-file.png"));
    });

    it("returns an empty array for paths that aren't directories or don't exist", function () {
      expect(fs.listSync(path.join(fixturesDir, "sample.js"))).toEqual([]);
      expect(fs.listSync("/non/existent/directory")).toEqual([]);
    });

    it("can filter the paths by an optional array of file extensions", function () {
      const paths = fs.listSync(fixturesDir, [".css", "coffee"]);
      expect(paths).toContain(path.join(fixturesDir, "css.css"));
      expect(paths).toContain(path.join(fixturesDir, "coffee.coffee"));
      paths.forEach((listedPath) =>
        expect(listedPath).toMatch(/(css|coffee)$/),
      );
    });

    it("returns alphabetically sorted paths (lowercase first)", function () {
      const paths = fs.listSync(fixturesDir);
      const sortedPaths = [
        path.join(fixturesDir, "binary-file.png"),
        path.join(fixturesDir, "coffee.coffee"),
        path.join(fixturesDir, "css.css"),
        path.join(fixturesDir, "link-to-sample.js"),
        path.join(fixturesDir, "sample.js"),
        path.join(fixturesDir, "Sample.markdown"),
        path.join(fixturesDir, "sample.txt"),
        path.join(fixturesDir, "test.cson"),
        path.join(fixturesDir, "test.json"),
        path.join(fixturesDir, "Xample.md"),
      ];
      expect(sortedPaths).toEqual(paths);
    });
  });

  describe(".list(path, [extensions,] callback)", function () {
    it("calls the callback with the absolute paths of entries within the given directory", (done) => {
      fs.list(fixturesDir, function (err, paths) {
        expect(paths).toContain(path.join(fixturesDir, "css.css"));
        expect(paths).toContain(path.join(fixturesDir, "coffee.coffee"));
        expect(paths).toContain(path.join(fixturesDir, "sample.txt"));
        expect(paths).toContain(path.join(fixturesDir, "sample.js"));
        expect(paths).toContain(path.join(fixturesDir, "binary-file.png"));
        done();
      });
    });

    it("can filter the paths by an optional array of file extensions", (done) => {
      fs.list(fixturesDir, ["css", ".coffee"], function (err, paths) {
        expect(paths).toContain(path.join(fixturesDir, "css.css"));
        expect(paths).toContain(path.join(fixturesDir, "coffee.coffee"));
        paths.forEach((listedPath) =>
          expect(listedPath).toMatch(/(css|coffee)$/),
        );
        done();
      });
    });
  });

  describe(".absolute(relativePath)", () =>
    it("converts a leading ~ segment to the HOME directory", function () {
      const homeDir = fs.getHomeDirectory();
      expect(fs.absolute("~")).toBe(fs.realpathSync(homeDir));
      expect(fs.absolute(path.join("~", "does", "not", "exist"))).toBe(
        path.join(homeDir, "does", "not", "exist"),
      );
      expect(fs.absolute("~test")).toBe("~test");
    }));

  describe(".getAppDataDirectory", function () {
    let originalPlatform = null;

    beforeEach(() => (originalPlatform = process.platform));

    afterEach(() =>
      Object.defineProperty(process, "platform", { value: originalPlatform }),
    );

    it("returns the Application Support path on Mac", function () {
      Object.defineProperty(process, "platform", { value: "darwin" });
      if (!process.env.HOME) {
        Object.defineProperty(process.env, "HOME", {
          value: path.join(path.sep, "Users", "Buzz"),
        });
      }
      expect(fs.getAppDataDirectory()).toBe(
        path.join(fs.getHomeDirectory(), "Library", "Application Support"),
      );
    });

    it("returns %AppData% on Windows", function () {
      Object.defineProperty(process, "platform", { value: "win32" });
      if (!process.env.APPDATA) {
        process.env["APPDATA"] = "C:\\Users\\test\\AppData\\Roaming";
      }
      expect(fs.getAppDataDirectory()).toBe(process.env.APPDATA);
    });

    it("returns /var/lib on linux", function () {
      Object.defineProperty(process, "platform", { value: "linux" });
      expect(fs.getAppDataDirectory()).toBe("/var/lib");
    });

    it("returns null on other platforms", function () {
      Object.defineProperty(process, "platform", { value: "foobar" });
      expect(fs.getAppDataDirectory()).toBe(null);
    });
  });

  describe(".getSizeSync(pathToCheck)", () =>
    it("returns the size of the file at the path", function () {
      expect(fs.getSizeSync()).toBe(-1);
      expect(fs.getSizeSync("")).toBe(-1);
      expect(fs.getSizeSync(null)).toBe(-1);
      expect(fs.getSizeSync(path.join(fixturesDir, "binary-file.png"))).toBe(
        392,
      );
      expect(fs.getSizeSync(path.join(fixturesDir, "does.not.exist"))).toBe(-1);
    }));

  describe(".writeFileSync(filePath)", () =>
    it("creates any missing parent directories", function () {
      const directory = temp.mkdirSync("fs-plus-");
      const file = path.join(directory, "a", "b", "c.txt");
      expect(fs.existsSync(path.dirname(file))).toBeFalsy();

      fs.writeFileSync(file, "contents");
      expect(fs.readFileSync(file, "utf8")).toBe("contents");
      expect(fs.existsSync(path.dirname(file))).toBeTruthy();
    }));

  describe(".writeFile(filePath)", () =>
    it("creates any missing parent directories", (done) => {
      const directory = temp.mkdirSync("fs-plus-");
      const file = path.join(directory, "a", "b", "c.txt");
      expect(fs.existsSync(path.dirname(file))).toBeFalsy();

      fs.writeFile(file, "contents", () => {
        expect(fs.readFileSync(file, "utf8")).toBe("contents");
        expect(fs.existsSync(path.dirname(file))).toBeTruthy();
        done();
      });
    }));

  describe(".copySync(sourcePath, destinationPath)", function () {
    let source, destination;

    beforeEach(function () {
      source = temp.mkdirSync("fs-plus-");
      destination = temp.mkdirSync("fs-plus-");
    });

    describe("with just files", function () {
      beforeEach(function () {
        fs.writeFileSync(path.join(source, "a.txt"), "a");
        fs.copySync(source, destination);
      });

      it("copies the file", () =>
        expect(fs.isFileSync(path.join(destination, "a.txt"))).toBeTruthy());
    });

    describe("with folders and files", function () {
      beforeEach(function () {
        fs.writeFileSync(path.join(source, "a.txt"), "a");
        fs.makeTreeSync(path.join(source, "b"));
        fs.copySync(source, destination);
      });

      it("copies the file and folder", function () {
        expect(fs.isFileSync(path.join(destination, "a.txt"))).toBeTruthy();
        expect(fs.isDirectorySync(path.join(destination, "b"))).toBeTruthy();
      });

      describe("source is copied into itself", function () {
        beforeEach(function () {
          source = temp.mkdirSync("fs-plus-");
          destination = source;
          fs.writeFileSync(path.join(source, "a.txt"), "a");
          fs.makeTreeSync(path.join(source, "b"));
          fs.copySync(source, path.join(destination, path.basename(source)));
        });

        it("copies the directory once", function () {
          expect(
            fs.isDirectorySync(path.join(destination, path.basename(source))),
          ).toBeTruthy();
          expect(
            fs.isDirectorySync(
              path.join(destination, path.basename(source), "b"),
            ),
          ).toBeTruthy();
          expect(
            fs.isDirectorySync(
              path.join(
                destination,
                path.basename(source),
                path.basename(source),
              ),
            ),
          ).toBeFalsy();
        });
      });
    });
  });

  describe(".copyFileSync(sourceFilePath, destinationFilePath)", () =>
    it("copies the specified file", function () {
      const sourceFilePath = temp.path();
      const destinationFilePath = path.join(
        temp.path(),
        "/unexisting-dir/foo.bar",
      );
      let content = "";
      for (let i = 0; i < 20000; i++) {
        content += "ABCDE";
      }
      fs.writeFileSync(sourceFilePath, content);
      fs.copyFileSync(sourceFilePath, destinationFilePath);
      expect(fs.readFileSync(destinationFilePath, "utf8")).toBe(
        fs.readFileSync(sourceFilePath, "utf8"),
      );
    }));

  describe(".isCaseSensitive()/isCaseInsensitive()", () =>
    it("does not return the same value for both", () =>
      expect(fs.isCaseInsensitive()).not.toBe(fs.isCaseSensitive())));

  describe(".resolve(loadPaths, pathToResolve, extensions)", () =>
    it("returns the resolved path or undefined if it does not exist", function () {
      expect(fs.resolve(fixturesDir, "sample.js")).toBe(
        path.join(fixturesDir, "sample.js"),
      );
      expect(fs.resolve(fixturesDir, "sample", ["js"])).toBe(
        path.join(fixturesDir, "sample.js"),
      );
      expect(fs.resolve(fixturesDir, "sample", ["abc", "txt"])).toBe(
        path.join(fixturesDir, "sample.txt"),
      );
      expect(fs.resolve(fixturesDir)).toBe(fixturesDir);

      expect(fs.resolve()).toBeUndefined();
      expect(fs.resolve(fixturesDir, "sample", ["badext"])).toBeUndefined();
      expect(fs.resolve(fixturesDir, "doesnotexist.js")).toBeUndefined();
      expect(fs.resolve(fixturesDir, undefined)).toBeUndefined();
      expect(fs.resolve(fixturesDir, 3)).toBeUndefined();
      expect(fs.resolve(fixturesDir, false)).toBeUndefined();
      expect(fs.resolve(fixturesDir, null)).toBeUndefined();
      expect(fs.resolve(fixturesDir, "")).toBeUndefined();
    }));

  describe(".isAbsolute(pathToCheck)", function () {
    let originalPlatform = null;

    beforeEach(() => (originalPlatform = process.platform));

    afterEach(() =>
      Object.defineProperty(process, "platform", { value: originalPlatform }),
    );

    it("returns false when passed \\", () =>
      expect(fs.isAbsolute("\\")).toBe(false));

    it("returns true when the path is absolute, false otherwise", function () {
      Object.defineProperty(process, "platform", { value: "win32" });

      expect(fs.isAbsolute()).toBe(false);
      expect(fs.isAbsolute(null)).toBe(false);
      expect(fs.isAbsolute("")).toBe(false);
      expect(fs.isAbsolute("test")).toBe(false);
      expect(fs.isAbsolute("a\\b")).toBe(false);
      expect(fs.isAbsolute("/a/b/c")).toBe(false);
      expect(fs.isAbsolute("\\\\server\\share")).toBe(true);
      expect(fs.isAbsolute("C:\\Drive")).toBe(true);

      Object.defineProperty(process, "platform", { value: "linux" });

      expect(fs.isAbsolute()).toBe(false);
      expect(fs.isAbsolute(null)).toBe(false);
      expect(fs.isAbsolute("")).toBe(false);
      expect(fs.isAbsolute("test")).toBe(false);
      expect(fs.isAbsolute("a/b")).toBe(false);
      expect(fs.isAbsolute("\\\\server\\share")).toBe(false);
      expect(fs.isAbsolute("C:\\Drive")).toBe(false);
      expect(fs.isAbsolute("/")).toBe(true);
      expect(fs.isAbsolute("/a/b/c")).toBe(true);
    });
  });

  describe(".normalize(pathToNormalize)", () =>
    it("normalizes the path", function () {
      expect(fs.normalize()).toBe(null);
      expect(fs.normalize(null)).toBe(null);
      expect(fs.normalize(true)).toBe("true");
      expect(fs.normalize("")).toBe(".");
      expect(fs.normalize(3)).toBe("3");
      expect(fs.normalize("a")).toBe("a");
      expect(fs.normalize("a/b/c/../d")).toBe(path.join("a", "b", "d"));
      expect(fs.normalize("./a")).toBe("a");
      expect(fs.normalize("~")).toBe(fs.getHomeDirectory());
      expect(fs.normalize("~/foo")).toBe(
        path.join(fs.getHomeDirectory(), "foo"),
      );
    }));

  describe(".tildify(pathToTildify)", function () {
    let getHomeDirectory = null;

    beforeEach(() => (getHomeDirectory = fs.getHomeDirectory));

    afterEach(() => (fs.getHomeDirectory = getHomeDirectory));

    it("tildifys the path on Linux and macOS", function () {
      if (process.platform === "win32") {
        return;
      }

      const home = fs.getHomeDirectory();

      expect(fs.tildify(home)).toBe("~");
      expect(fs.tildify(path.join(home, "foo"))).toBe("~/foo");
      let fixture = path.join("foo", home);
      expect(fs.tildify(fixture)).toBe(fixture);
      fixture = path.resolve(`${home}foo`, "tildify");
      expect(fs.tildify(fixture)).toBe(fixture);
      expect(fs.tildify("foo")).toBe("foo");
    });

    it("does not tildify if home is unset", function () {
      if (process.platform === "win32") {
        return;
      }

      const home = fs.getHomeDirectory();
      fs.getHomeDirectory = () => undefined;

      const fixture = path.join(home, "foo");
      expect(fs.tildify(fixture)).toBe(fixture);
    });

    it("doesn't change URLs or paths not tildified", function () {
      const urlToLeaveAlone = "https://atom.io/something/fun?abc";
      expect(fs.tildify(urlToLeaveAlone)).toBe(urlToLeaveAlone);

      const pathToLeaveAlone = "/Library/Support/Atom/State";
      expect(fs.tildify(pathToLeaveAlone)).toBe(pathToLeaveAlone);
    });
  });

  describe(".move", function () {
    let tempDir = null;

    beforeEach(() => (tempDir = temp.mkdirSync("fs-plus-")));

    it("calls back with an error if the source does not exist", (done) => {
      const directoryPath = path.join(tempDir, "subdir");
      const newDirectoryPath = path.join(tempDir, "subdir2", "subdir2");

      fs.move(directoryPath, newDirectoryPath, (err) => {
        expect(err).toBeTruthy();
        expect(err.code).toBe("ENOENT");
        done();
      });
    });

    it("calls back with an error if the target already exists", (done) => {
      const directoryPath = path.join(tempDir, "subdir");
      fs.mkdirSync(directoryPath);
      const newDirectoryPath = path.join(tempDir, "subdir2");
      fs.mkdirSync(newDirectoryPath);

      fs.move(directoryPath, newDirectoryPath, (err) => {
        expect(err).toBeTruthy();
        expect(err.code).toBe("EEXIST");
        done();
      });
    });

    it("renames if the target just has different letter casing", (done) => {
      const directoryPath = path.join(tempDir, "subdir");
      fs.mkdirSync(directoryPath);
      const newDirectoryPath = path.join(tempDir, "SUBDIR");

      fs.move(directoryPath, newDirectoryPath, () => {
        expect(fs.existsSync(directoryPath)).toBe(fs.isCaseInsensitive());
        expect(fs.existsSync(newDirectoryPath)).toBe(true);
        done();
      });
    });

    it("renames to a target with an existent parent directory", (done) => {
      const directoryPath = path.join(tempDir, "subdir");
      fs.mkdirSync(directoryPath);
      const newDirectoryPath = path.join(tempDir, "subdir2");

      fs.move(directoryPath, newDirectoryPath, () => {
        expect(fs.existsSync(directoryPath)).toBe(false);
        expect(fs.existsSync(newDirectoryPath)).toBe(true);
        done();
      });
    });

    it("renames to a target with a non-existent parent directory", (done) => {
      const directoryPath = path.join(tempDir, "subdir");
      fs.mkdirSync(directoryPath);
      const newDirectoryPath = path.join(tempDir, "subdir2/subdir2");

      fs.move(directoryPath, newDirectoryPath, () => {
        expect(fs.existsSync(directoryPath)).toBe(false);
        expect(fs.existsSync(newDirectoryPath)).toBe(true);
        done();
      });
    });

    it("renames files", (done) => {
      const filePath = path.join(tempDir, "subdir");
      fs.writeFileSync(filePath, "");
      const newFilePath = path.join(tempDir, "subdir2");

      fs.move(filePath, newFilePath, () => {
        expect(fs.existsSync(filePath)).toBe(false);
        expect(fs.existsSync(newFilePath)).toBe(true);
        done();
      });
    });
  });

  describe(".moveSync", function () {
    let tempDir = null;

    beforeEach(() => (tempDir = temp.mkdirSync("fs-plus-")));

    it("throws an error if the source does not exist", function () {
      const directoryPath = path.join(tempDir, "subdir");
      const newDirectoryPath = path.join(tempDir, "subdir2", "subdir2");

      expect(() => fs.moveSync(directoryPath, newDirectoryPath)).toThrow();
    });

    it("throws an error if the target already exists", function () {
      const directoryPath = path.join(tempDir, "subdir");
      fs.mkdirSync(directoryPath);
      const newDirectoryPath = path.join(tempDir, "subdir2");
      fs.mkdirSync(newDirectoryPath);

      expect(() => fs.moveSync(directoryPath, newDirectoryPath)).toThrow();
    });

    it("renames if the target just has different letter casing", function () {
      const directoryPath = path.join(tempDir, "subdir");
      fs.mkdirSync(directoryPath);
      const newDirectoryPath = path.join(tempDir, "SUBDIR");

      fs.moveSync(directoryPath, newDirectoryPath);

      expect(fs.existsSync(directoryPath)).toBe(fs.isCaseInsensitive());
      expect(fs.existsSync(newDirectoryPath)).toBe(true);
    });

    it("renames to a target with an existent parent directory", function () {
      const directoryPath = path.join(tempDir, "subdir");
      fs.mkdirSync(directoryPath);
      const newDirectoryPath = path.join(tempDir, "subdir2");

      fs.moveSync(directoryPath, newDirectoryPath);

      expect(fs.existsSync(directoryPath)).toBe(false);
      expect(fs.existsSync(newDirectoryPath)).toBe(true);
    });

    it("renames to a target with a non-existent parent directory", function () {
      const directoryPath = path.join(tempDir, "subdir");
      fs.mkdirSync(directoryPath);
      const newDirectoryPath = path.join(tempDir, "subdir2/subdir2");

      fs.moveSync(directoryPath, newDirectoryPath);

      expect(fs.existsSync(directoryPath)).toBe(false);
      expect(fs.existsSync(newDirectoryPath)).toBe(true);
    });

    it("renames files", function () {
      const filePath = path.join(tempDir, "subdir");
      fs.writeFileSync(filePath, "");
      const newFilePath = path.join(tempDir, "subdir2");

      fs.moveSync(filePath, newFilePath);

      expect(fs.existsSync(filePath)).toBe(false);
      expect(fs.existsSync(newFilePath)).toBe(true);
    });
  });

  describe(".isBinaryExtension", function () {
    it("returns true for a recognized binary file extension", () =>
      expect(fs.isBinaryExtension(".DS_Store")).toBe(true));

    it("returns false for non-binary file extension", () =>
      expect(fs.isBinaryExtension(".bz2")).toBe(false));

    it("returns true for an uppercase binary file extension", () =>
      expect(fs.isBinaryExtension(".EXE")).toBe(true));
  });

  describe(".isCompressedExtension", function () {
    it("returns true for a recognized compressed file extension", () =>
      expect(fs.isCompressedExtension(".bz2")).toBe(true));

    it("returns false for non-compressed file extension", () =>
      expect(fs.isCompressedExtension(".jpg")).toBe(false));
  });

  describe(".isImageExtension", function () {
    it("returns true for a recognized image file extension", () =>
      expect(fs.isImageExtension(".jpg")).toBe(true));

    it("returns false for non-image file extension", () =>
      expect(fs.isImageExtension(".bz2")).toBe(false));
  });

  describe(".isMarkdownExtension", function () {
    it("returns true for a recognized Markdown file extension", () =>
      expect(fs.isMarkdownExtension(".md")).toBe(true));

    it("returns false for non-Markdown file extension", () =>
      expect(fs.isMarkdownExtension(".bz2")).toBe(false));

    it("returns true for a recognised Markdown file extension with unusual capitalisation", () =>
      expect(fs.isMarkdownExtension(".MaRKdOwN")).toBe(true));
  });

  describe(".isPdfExtension", function () {
    it("returns true for a recognized PDF file extension", () =>
      expect(fs.isPdfExtension(".pdf")).toBe(true));

    it("returns false for non-PDF file extension", () =>
      expect(fs.isPdfExtension(".bz2")).toBe(false));

    it("returns true for an uppercase PDF file extension", () =>
      expect(fs.isPdfExtension(".PDF")).toBe(true));
  });

  describe(".isReadmePath", function () {
    it("returns true for a recognized README path", () =>
      expect(fs.isReadmePath("./path/to/README.md")).toBe(true));

    it("returns false for non README path", () =>
      expect(fs.isReadmePath("./path/foo.txt")).toBe(false));
  });
});
