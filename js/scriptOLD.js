require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/tasks/IdentifyTask",
  "esri/tasks/support/IdentifyParameters",
  "esri/layers/TileLayer",
  "esri/tasks/QueryTask",
  "esri/tasks/support/Query",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Expand",
  "esri/widgets/Sketch/SketchViewModel",
  "esri/widgets/Slider",
  "esri/geometry/geometryEngine",
  "esri/Graphic",
  "esri/core/promiseUtils"
], function (
  Map, MapView, FeatureLayer, IdentifyTask, IdentifyParameters, TileLayer,
  QueryTask, Query, GraphicsLayer, Expand, SketchViewModel, Slider, geometryEngine,
  Graphic, promiseUtils
) {
  // URL to the map service where the identify will be performed
  var soilURL = "https://gis.uaig.kz/server/rest/services/Map2d/объекты_города3/MapServer";
  var gisBasemapUrl = "https://gis.uaig.kz/server/rest/services/BaseMapAlm_MIL1/MapServer";
  // var queryUrl = "https://gis.uaig.kz/server/rest/services/BaseMapAlm_MIL1/MapServer/13";
  var queryUrl = "https://gis.uaig.kz/server/rest/services/Map2d/Buildings0307/MapServer/0";
  var identifyTask, params, almatyLayer, resultsLayer, houseTypes = [], peakResults,
      colors = [];

  // Добавление слоев
  resultsLayer = new GraphicsLayer({
    title: "Тип объекта"
  });

  // При площади
  geometryLayer = new GraphicsLayer({
    title: "Рисунок"
  })

  almatyLayer = new TileLayer({
    url: gisBasemapUrl,
    title: "Ком услуги"
  });

  // Создаем объект слоя
  // var almaty_layer = new FeatureLayer({
  //   url: soilURL,
  //   opacity: 0.85
  // });

  var map = new Map({
    layers: [almatyLayer],
    basemap: null
  });

  // map.add(almaty_layer); // подгружаем слой к базовой карте
  // console.log(almatyLayer);
  var view = new MapView({
    container: "viewDiv",  // Reference to the scene div created in step 5
    map: map,  // Reference to the map object created before the scene
    scale: 10000,
    center: [76.910, 43.220]  // Sets center point of view using longitude,latitude (Алматы)
  });

  var typeHomeExpand = new Expand({
    view: view,
    content: document.getElementById('info'),
    expandIconClass: "esri-icon-organization"
  });

  view.when(function () {

    // view.ui.add("info", "bottom-left");
    view.ui.add(typeHomeExpand, "bottom-left");
    view.ui.add([queryDiv], "bottom-right");
    // // executeIdentifyTask() is called each time the view is clicked //???
    // view.on("click", executeIdentifyTask);
    //
    // // Create identify task for the specified map service
    // identifyTask = new IdentifyTask(soilURL);
    //
    // // Параметры для поиска
    // params = new IdentifyParameters();
    // params.tolerance = 3; //Дистанция от точки клика в пикселях
    // params.layerIds = [14]; //Номера слоев где искать
    // params.layerOption = "top"; // искать на верхних слоях (IdentifyParameters.LAYER_OPTION_VISIBLE;)
    // params.width = view.width; // Размеры видимой карты
    // params.height = view.height;

    addUlLi();

  });




  // function makeAjaxCall(address) { //???
  //   return $.ajax({
  //     type: "GET",
  //     url: 'get_all.php?address=' + encodeURI(address),
  //     async: false
  //   }).responseText;
  // }

  // Executes each time the view is clicked
  // function executeIdentifyTask(event) {
  //   // Set the geometry to the location of the view click
  //   params.geometry = event.mapPoint;
  //   params.mapExtent = view.extent;
  //   document.getElementById("viewDiv").style.cursor = "wait";
  //
  //   // This function returns a promise that resolves to an array of features
  //   // A custom popupTemplate is set for each feature based on the layer it
  //   // originates from
  //
  //   identifyTask.execute(params).then(function (response) {
  //
  //     var results = response.results;
  //
  //     return results.map(function (result) {
  //       var feature = result.feature;
  //       var layerName = result.layerName;
  //       let currentAddress = feature.attributes['полный адрес'];
  //       var data = JSON.parse(makeAjaxCall(currentAddress));
  //       feature.attributes['water'] = data['water'];
  //       feature.attributes['gas'] = data['gas'];
  //       feature.attributes['internet'] = data['internet'];
  //       feature.attributes['heat'] = data['heat'];
  //       feature.attributes.layerName = layerName;
  //       if (layerName === 'Здания и сооружения') {
  //         feature.popupTemplate = { // autocasts as new PopupTemplate()
  //         title: "Коммунальные службы",
  //         content: "<div class='esri-feature__fields esri-feature__content-element'>"+
  //           "<table class='esri-widget__table'>"+
  //             "<tbody>"+
  //                 "<tr>"+
  //                 "<th class='esri-feature__field-header'>Адрес:</th>"+
  //                 "<td class='esri-feature__field-data'>{полный адрес}</td>"+
  //               "</tr>"+
  //               "<tr>"+
  //                 "<th class='esri-feature__field-header'>Расход воды:</th>"+
  //                 "<td class='esri-feature__field-data'>{water}</td>"+
  //               "</tr>"+
  //               "<tr>"+
  //                 "<th class='esri-feature__field-header'>Расход газа:</th>"+
  //                 "<td class='esri-feature__field-data'>{gas}</td>"+
  //               "</tr>"+
  //
  //               "<tr>"+
  //                 "<th class='esri-feature__field-header'>Интернет:</th>"+
  //                 "<td class='esri-feature__field-data'>{internet}</td>"+
  //               "</tr>"+
  //               "<tr>"+
  //                 "<th class='esri-feature__field-header'>Расход отопления:</th>"+
  //                 "<td class='esri-feature__field-data'>{heat} </td>"+
  //               "</tr>"+
  //             "</tbody>"+
  //           "</table>"+
  //         "</div>"
  //         }
  //
  //
  //       }
  //
  //       return feature;
  //
  //     });
  //   }).then(showPopup); // Send the array of features to showPopup()
  //
  //     // Shows the results of the Identify in a popup once the promise is resolved
  //   function showPopup(response) {
  //     if (response.length > 0) {
  //       view.popup.open({
  //         features: response,
  //         location: event.mapPoint
  //       });
  //     }
  //     document.getElementById("viewDiv").style.cursor = "auto";
  //   }
  // } //???

  // Запрос на arcgis
  function doQuery(name) {
    onClickLoader.style.display = 'inline-block';
    var sqlTxt;

    // sqlTxt = "1=1";
    sqlTxt = text(name);
    // sqlTxt = "name NOT LIKE 'офис'";

    var qTask = new QueryTask({
      url: queryUrl
    });

    var params = new Query({
      returnGeometry: true,
      outFields: ["name"],
      geometry: view.extent
    });
    params.where = sqlTxt;
    qTask.execute(params)
      .then(getResults)
      .catch(promiseRejected);
  }

  // Вызывается каждый раз, когда запрос прошел
  function getResults(response) {

    let color = addColor(response.features[0].attributes.name)

    peakResults = response.features.map(function(feature) {

      feature.symbol = symbol(color);
      return feature;
    });

    createLayer(peakResults[0].attributes.name, findNameValue(peakResults[0].attributes.name));
  }

  // Вызывается каждый раз, когда запрос отколняется
  function promiseRejected(error) {
    console.error("Promise rejected: ", error.message);
    onClickLoader.style.display = 'none';
  }

  // Рассшифровка типа дома по ID
  const findNameValue = id => {
    var value;
    homeType.forEach((el) => {
      if (el.name == id) {
        value = el.value;
        return;
      }
    })
    return value;
  }

  // Вызывается для создания списка типов домов
  const addUlLi = () => {
    var info = document.getElementById('info');

    var ul = document.createElement('ul');
    ul.classList.add('ks-cboxtags');

    var li, input, label, id, value;

    homeType.forEach((el) => {
      id = el.name;
      value = el.value;
      li = document.createElement('li');
      input = document.createElement('input');
      label = document.createElement('label');
      input.type = 'checkbox';
      input.id = id;
      input.setAttribute('for', id);
      input.value = value;
      label.id = "label-"+id;
      label.setAttribute('for', id);
      // label.id = k+"label";
      label.innerHTML = value;
      li.appendChild(input);
      // label.appendChild(input);
      li.appendChild(label);
      ul.appendChild(li);
    })

    addArrayColor(homeType.length);
    info.appendChild(ul);
    checkInputs();

  }

  // Текст запроса по типу дома
  const text = name => {
    var str = '';
    homeType.forEach((el) => {
      if (el.name === name) {
        str = "name = "+el.name;
        return;
      }
    })
    return str;
  }

  // Проверяет какой тип был нажат
  function checkInputs() {
    var inputs = document.querySelectorAll('li input');

    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('click', checkCheckbox);
    }
  }

  // Заполнение массива разными цветами
  function addArrayColor(length){
    var k = 0;

    while (length !== colors.length) {
      var color = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
      var arr = {
        name: '',
        color: color
      }
      if (colors.length == 0) {
        colors[k] = arr;
        k++;
      } else {
        var index = colors.findIndex(el => el.color === color);
        if (index == -1) {
          colors[k] = arr;
          k++;
        }
      }
    }// while
  }

  // При нажатии на тип
  function checkCheckbox(e) {
    const element = e.toElement;
    if (element.checked){
      doQuery(element.id);
    } else {
      deleteLayer(element.id, element.defaultValue);
    }
  }

  // Создает слой
  function createLayer(id, name) {
    this["layer"+id] = new GraphicsLayer({
      title: name
    });

    this["layer"+id].addMany(addToLayer(id, name));

    map.add(this["layer"+id]);
    onClickLoader.style.display = 'none';
  }

  // Добавляет свойства слоя
  function addToLayer(id, name) {
    var color_symbol = addColor(id);
    addLabelColor(id, color_symbol);
    return peakResults;
  }

  // Добавляет нажатому типу свой цвет
  function addColor(id){
    var index1 = colors.findIndex(el => el.name === id);
    if(index1 == -1){
      var index2 = colors.findIndex(el => el.name === '');
      colors[index2].name = id;
      return colors[index2].color;
    } else {
      return colors[index1].color;
    }
  }

  // Цвет "кнопки" при нажатии
  function addLabelColor(id, clr) {
    var label = document.getElementById('label-'+id);
    label.style.backgroundColor = clr;
  }

  // Создает окраску для типа дома
  function symbol(clr) {

    var symbol = {
      type: "simple-fill",  // autocasts as new SimpleFillSymbol()
      color: clr,
      style: "solid",
      outline: {  // autocasts as new SimpleLineSymbol()
        color: clr,
        width: 1
      }
    }

    return symbol;
  }

  // Удаление слоя
  function deleteLayer(id, name) {
    deleteLabelColor(id, name);
    map.layers.items.forEach(function(layer) {
      if (layer.title == name) {
        map.remove(layer);
      }
    })
  }

  // Удаляет "цвет" кнопки
  function deleteLabelColor(id, name) {
    var label = document.getElementById('label-'+id);
    label.removeAttribute('style');
    deleteColor(id);
  }

  // Удаление цвет нажатого типа дома
  function deleteColor(id) {
    var index = colors.findIndex((el) => el.name == id);
    colors[index].name = '';
  }

  //----------------------------------------------------------------
  // add a GraphicsLayer for the sketches and the buffer
  const sketchLayer = new GraphicsLayer();
  const bufferLayer = new GraphicsLayer();
  view.map.addMany([bufferLayer, sketchLayer]);

  // let sceneLayer = null;
  // let sceneLayerView = null;
  let bufferSize = 0;

  // // Assign scene layer once view is loaded and initialize UI
  // view.load().then(function() {
  //   sceneLayer = view.layers.find(function(layer) {
  //     return layer.title === "Helsinki textured buildings";
  //   });
  //   sceneLayer.outFields = ["buildingMaterial", "yearCompleted"];
  //
  //   view.whenLayerView(sceneLayer).then(function(layerView) {
  //     sceneLayerView = layerView;
  //     queryDiv.style.display = "block";
  //   });
  // });

  // view.watch("updating", function(updating) {
  //   if (!updating) {
  //     console.log("upd");
  //     runQuery();
  //   }
  // });



  // use SketchViewModel to draw polygons that are used as a query
  let sketchGeometry = null;
  const sketchViewModel = new SketchViewModel({
    layer: sketchLayer,
    defaultUpdateOptions: {
      tool: "reshape",
      toggleToolOnClick: false
    },
    view: view
  });

  sketchViewModel.on("create", function(event) {
    if (event.state === "complete") {
      sketchGeometry = event.graphic.geometry;
      runQuery();
    }
  });

  sketchViewModel.on("update", function(event) {
    if (event.state !== "cancel" && event.graphics.length) {
      sketchGeometry = event.graphics[0].geometry;
      runQuery();
    }
  });
  // draw geometry buttons - use the selected geometry to sktech
  document
    .getElementById("point-geometry-button")
    .addEventListener("click", geometryButtonsClickHandler);
  document
    .getElementById("line-geometry-button")
    .addEventListener("click", geometryButtonsClickHandler);
  document
    .getElementById("polygon-geometry-button")
    .addEventListener("click", geometryButtonsClickHandler);
  function geometryButtonsClickHandler(event) {
    const geometryType = event.target.value;
    clearGeometry();
    sketchViewModel.create(geometryType);
  }

  const bufferNumSlider = new Slider({
    container: "bufferNum",
    min: 0,
    max: 500,
    steps: 1,
    labelsVisible: true,
    precision: 0,
    labelFormatFunction: function(value, type) {
      return value.toString() + "m";
    },
    values: [0]
  });
  // get user entered values for buffer
  bufferNumSlider.on("value-change", bufferVariablesChanged);
  function bufferVariablesChanged(event) {
    bufferSize = event.value;
    runQuery();
  }
  // Clear the geometry and set the default renderer
  document
    .getElementById("clearGeometry")
    .addEventListener("click", clearGeometry);

  // Clear the geometry and set the default renderer
  function clearGeometry() {
    sketchGeometry = null;
    sketchViewModel.cancel();
    sketchLayer.removeAll();
    bufferLayer.removeAll();
  }

  // set the geometry query on the visible SceneLayerView
  var debouncedRunQuery = promiseUtils.debounce(function() {
    if (!sketchGeometry) {
      console.log("runbedreturn");
      return;
    }

    updateBufferGraphic(bufferSize);
    return promiseUtils.eachAlways([
      queryStatistics(),
      // updateSceneLayer()
    ]);
  });

  function runQuery() {
    debouncedRunQuery().catch((error) => {
      if (error.name === "AbortError") {
        return;
      }

      console.error(error);
    });
  }

  // update the graphic with buffer
  function updateBufferGraphic(buffer) {
    // add a polygon graphic for the buffer
    if (buffer > 0) {
      var bufferGeometry = geometryEngine.geodesicBuffer(
        sketchGeometry,
        buffer,
        "meters"
      );
      if (bufferLayer.graphics.length === 0) {
        bufferLayer.add(
          new Graphic({
            geometry: bufferGeometry,
            symbol: sketchViewModel.polygonSymbol
          })
        );
      } else {
        bufferLayer.graphics.getItemAt(0).geometry = bufferGeometry;
      }
    } else {
      bufferLayer.removeAll();
    }
  }

  function updateSceneLayer() {// query бычный
    // const query = sceneLayerView.createQuery();
    // query.geometry = sketchGeometry;
    // query.distance = bufferSize;
    // return sceneLayerView.queryObjectIds(query).then(highlightBuildings);

    var qTask = new QueryTask({
      url: queryUrl
    });

    var params = new Query({
      returnGeometry: true,
      geometry: sketchGeometry,
      distance: bufferSize,
      outFields: ["address"]
    });

    qTask.execute(params)
      .then(getResults)
      .catch(promiseRejected);

      // Вызывается каждый раз, когда запрос прошел
      function getResults(response) {
        console.log(response);
        // let color = addColor(response.features[0].attributes.name)
        //
        // peakResults = response.features.map(function(feature) {
        //
        //   feature.symbol = symbol(color);
        //   return feature;
        // });

      }

      // Вызывается каждый раз, когда запрос отколняется
      function promiseRejected(error) {
        console.error("Promise rejected: ", error.message);
        onClickLoader.style.display = 'none';
      }
  }

  function queryStatistics() {//???
    // const query = sceneLayerView.createQuery();
    // query.geometry = sketchGeometry;
    // query.distance = bufferSize;

    // return sceneLayerView.queryFeatures(query).then(function(result) {
    //   const allStats = result.features[0].attributes;
    // }, console.error);

    var qTask = new QueryTask({
      url: queryUrl
    });

    var params = new Query({
      returnGeometry: true,
      geometry: sketchGeometry,
      distance: bufferSize,
      outFields: ["address"]
    });

    qTask.execute(params)
      .then(getResults)
      .catch(promiseRejected);

      // Вызывается каждый раз, когда запрос прошел
      function getResults(response) {
        console.log(response);
        // let color = addColor(response.features[0].attributes.name)
        //
        var allAsd = response.features.map(function(feature) {
          feature.symbol = {
            type: "simple-fill",  // autocasts as new SimpleFillSymbol()
            color: "green",
            style: "solid",
            outline: {  // autocasts as new SimpleLineSymbol()
              color: "green",
              width: 1
            }
          };
        });
        geometryLayer.addMany(allAsd);//???
        view.map.add(geometryLayer);
      }


      // Вызывается каждый раз, когда запрос отколняется
      function promiseRejected(error) {
        console.error("Promise rejected: ", error.message);
        onClickLoader.style.display = 'none';
      }
  }

  //----------------------------------------------------------------

});
