module.exports = async function () {
  console.log("Compiling Public");

  let source_folder = Application.config.Directories.AppPublicSrc;
  let destination_folder = Application.config.Directories.AppPublic;

  let path = {
    src: {
      fonts: Application.lib.path.join(source_folder, "fonts"),
      img: Application.lib.path.join(source_folder, "img"),
      css: Application.lib.path.join(source_folder, "scss"),
      js: Application.lib.path.join(source_folder, "js"),
    },
    dst: {
      fonts: Application.lib.path.join(destination_folder, "fonts"),
      img: Application.lib.path.join(destination_folder, "img"),
      css: Application.lib.path.join(destination_folder, "css"),
      js: Application.lib.path.join(destination_folder, "js"),
    },
  };

  //Create directories if not exist
  for (let _dir_name in path.dst) {
    let item = path.dst[_dir_name];
    console.log(item);
    if (!Application.lib.fs.existsSync(item)) {
      Application.lib.fs.mkdirSync(item);
      console.log("Directory created: " + item);
    }
  }
  //Copy static fonts to Public
  if (Application.config.PublicBuilder.DeployFonts == "true") {
    console.log("Deploying fonts");
    console.log(path.src.fonts);

    Application.lib.fs
      .readdirSync(path.src.fonts)
      .forEach(async function (item) {
        if (
          !Application.lib.fs
            .lstatSync(Application.lib.path.join(path.src.fonts, item))
            .isDirectory()
        ) {
          //not a dir
          let file_body = Application.lib.fs.readFileSync(
            Application.lib.path.join(path.src.fonts, item)
          );
          Application.lib.fs.writeFileSync(
            Application.lib.path.join(path.dst.fonts, item),
            file_body
          );
          console.log("Font ready: " + item);
        }
      });
  }

  //Repack and deploy static img to Public
  if (Application.config.PublicBuilder.DeployImg == "true") {
    console.log("Deploying repacked images");
    console.log(path.src.img);

    let imagemin = require("imagemin");
    let imagemin_plugins = [
      require("imagemin-jpegtran")({
        progressive: true,
      }),
      require("imagemin-pngquant")({
        quality: [0.6, 0.8],
      }),
      require("imagemin-svgo")({
        plugins: [
          {
            removeViewBox: true,
          },
        ],
      }),
    ];
    let files = await imagemin(
      [path.src.img + "/*." + Application.config.PublicBuilder.ImgExt],
      {
        destination: path.dst.img,
        plugins: imagemin_plugins,
      }
    );
    for (let i in files) {
      console.log("Image ready: " + files[i].destinationPath);
    }
    //for webp versions
    if (Application.config.PublicBuilder.ImgCreateWEBP == "true") {
      imagemin_plugins.push(
        require("imagemin-webp")({
          quality: 50,
        })
      );
      files = await imagemin(
        [
          path.src.img +
            Application.lib.path.sep +
            "*." +
            Application.config.PublicBuilder.ImgExt,
        ],
        {
          destination: path.dst.img,
          plugins: imagemin_plugins,
        }
      );
      for (let i in files) {
        console.log("Image ready: " + files[i].destinationPath);
      }
    }

    delete files;
  }

  //Build SVG tagged packs for targets
  if (Application.config.PublicBuilder.BuildSVG == "true") {
    let target_files_list = [];
    console.log("Building SVG");
    console.log(path.dst.img);

    let SVGstore = require("svgstore");
    let src_files_list = [];

    SVG_build = function (file_body) {
      let markerBefore = "@include('";
      let markerAfter = "')";
      let markers = file_body.split(markerBefore);
      let new_markers = [];
      if (markers.length > 1)
        for (let i = 0; i < markers.length - 1; i++)
          new_markers[i] = markers[i + 1];
      markers = new_markers;
      delete new_markers;
      for (let i in markers) {
        markers[i] = markers[i].split(markerAfter)[0];
      }
      if (markers.length > 0) {
        let sprites = SVGstore();
        for (i = 0; i < markers.length; i++) {
          src_files_list.push(markers[i]);
          let spritename = markers[i].split(".svg")[0].split("/");
          spritename = spritename[spritename.length - 1];
          sprites = sprites.add(
            spritename,
            Application.lib.fs.readFileSync(
              Application.lib.path.join(path.dst.img, markers[i]),
              "utf8"
            )
          );
        }
        return sprites;
      }
    };

    let list_src_svg = Application.lib.fs
      .readdirSync(path.src.img)
      .filter((el) => /\.svg$/.test(el));
    for (let i in list_src_svg) {
      let item = list_src_svg[i];
      if (
        !Application.lib.fs
          .lstatSync(Application.lib.path.join(path.src.img, item))
          .isDirectory()
      ) {
        //not a dir
        let target_View = false;
        let filename = item.split(".svg")[0];
        let view_name = filename.split("_").join(".");
        try {
          target_View = Application.module.ObjSelector(
            Application.View,
            view_name
          );
        } catch (e) {}
        if (target_View && typeof target_View != "object") {
          console.log("SVG Target resolved: " + item);
          target_files_list.push(item);
          let file_body = Application.lib.fs
            .readFileSync(Application.lib.path.join(path.src.img, item))
            .toString("utf8");
          file_body = SVG_build(file_body);
          Application.lib.fs.writeFileSync(
            Application.lib.path.join(path.dst.img, filename + ".svg"),
            file_body
          );
          console.log("SVG Target ready: " + filename + ".svg");
        }
      }
    }

    if (Application.config.PublicBuilder.RemoveSrcSVG == "true") {
      src_files_list = [...new Set(src_files_list)];
      src_files_list.forEach(function (item) {
        if (target_files_list.indexOf(item) < 0) {
          Application.lib.fs.unlinkSync(
            Application.lib.path.join(path.dst.img, item)
          );
          console.log("SVG Removed: " + item);
        }
      });
    }
    delete file_body;
    delete src_files_list;
    delete target_files_list;
  }

  //Build JS for View targets
  if (Application.config.PublicBuilder.BuildJS == "true") {
    console.log("Building javascript");
    console.log(path.src.js);

    let minifyJS = require("terser").minify;

    js_include_other = function (file_body) {
      let markerBefore = "@include('";
      let markerAfter = "')";
      let _aggregateMarkers = function (file_body) {
        let markers = file_body.split(markerBefore);
        let new_markers = [];
        if (markers.length > 1)
          for (let i = 0; i < markers.length - 1; i++)
            new_markers[i] = markers[i + 1];
        markers = new_markers;
        delete new_markers;
        for (let i in markers) {
          markers[i] = markers[i].split(markerAfter)[0];
        }
        return markers;
      };
      let _apply = function (target, marker, content) {
        try {
          target = target
            .split(markerBefore + marker + markerAfter)
            .join(content);
        } catch (e) {
          ErrorCatcher(e);
        }
        return target;
      };
      let markers = _aggregateMarkers(file_body);
      if (markers.length > 0) {
        for (let i = 0; i < markers.length; i++) {
          let other_body = Application.lib.fs
            .readFileSync(Application.lib.path.join(path.src.js, markers[i]))
            .toString("utf8");
          other_body = js_include_other(other_body);
          file_body = _apply(file_body, markers[i], other_body);
        }
      }
      return file_body;
    };

    Application.lib.fs.readdirSync(path.src.js).forEach(async function (item) {
      if (
        !Application.lib.fs
          .lstatSync(Application.lib.path.join(path.src.js, item))
          .isDirectory()
      ) {
        //not a dir
        let target_View = false;
        let filename = item.split(".js")[0];
        let view_name = filename.split("_").join(".");
        try {
          target_View = Application.module.ObjSelector(
            Application.View,
            view_name
          );
        } catch (e) {}
        if (target_View && typeof target_View != "object") {
          console.log("JS Target resolved: " + item);
          let file_body = Application.lib.fs
            .readFileSync(Application.lib.path.join(path.src.js, item))
            .toString("utf8");
          file_body = js_include_other(file_body);
          Application.lib.fs.writeFileSync(
            Application.lib.path.join(path.dst.js, filename + ".js"),
            file_body
          );
          console.log("JS Target ready: " + filename + ".js");
          if (Application.config.PublicBuilder.MinifyJS == "true") {
            file_body = await minifyJS(file_body);
            Application.lib.fs.writeFileSync(
              Application.lib.path.join(path.dst.js, filename + ".min.js"),
              file_body.code
            );
            console.log("JS Target ready: " + filename + ".min.js");
          }
        }
      }
    });
  }

  //Build CSS for View targets
  if (Application.config.PublicBuilder.BuildCSS == "true") {
    console.log("Building css");
    console.log(path.src.css);

    let sass = require("node-sass");
    let GroupCssMediaQueries = require("group-css-media-queries");
    let minifyCSS = require("clean-css");
    let PostCSS = require("postcss");
    let PostCSS_plugins = [
      require("postcss-unprefix"),
      require("precss"),
      require("autoprefixer"),
    ];
    Application.lib.fs.readdirSync(path.src.css).forEach(async function (item) {
      if (
        !Application.lib.fs
          .lstatSync(Application.lib.path.join(path.src.css, item))
          .isDirectory()
      ) {
        //not a dir
        let target_View = false;
        let filename = item.split(".scss")[0];
        let view_name = filename.split("_").join(".");
        try {
          target_View = Application.module.ObjSelector(
            Application.View,
            view_name
          );
        } catch (e) {}
        if (target_View && typeof target_View != "object") {
          console.log("CSS Target resolved: " + item);
          let file_body = sass.renderSync({
            file: Application.lib.path.join(path.src.css, item),
          });
          file_body = file_body.css.toString("utf8");
          file_body = GroupCssMediaQueries(file_body);
          PostCSS(PostCSS_plugins)
            .process(file_body, {
              from: undefined,
            })
            .then((result) => {
              result.warnings().forEach((warn) => {
                console.warn(warn.toString());
              });
              file_body = result.css;
              Application.lib.fs.writeFileSync(
                Application.lib.path.join(path.dst.css, filename + ".css"),
                file_body
              );
              console.log("CSS Target ready: " + filename + ".css");
              if (Application.config.PublicBuilder.MinifyCSS == "true") {
                file_body = new minifyCSS().minify(file_body);
                Application.lib.fs.writeFileSync(
                  Application.lib.path.join(
                    path.dst.css,
                    filename + ".min.css"
                  ),
                  file_body.styles
                );
                console.log("CSS Target ready: " + filename + ".min.css");
              }
            });
        }
      }
    });
  }
};
