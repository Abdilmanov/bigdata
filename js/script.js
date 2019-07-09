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
  var queryUrl = "https://gis.uaig.kz/server/rest/services/BaseMapAlm_MIL1/MapServer/13";
  var identifyTask, params, almatyLayer, resultsLayer, houseTypes = [], peakResults,
      count = 0, colors = [];

  // Добавление слоев
  resultsLayer = new GraphicsLayer({
    title: "Тип здания"
  });

  almatyLayer = new TileLayer({
    url: gisBasemapUrl,
    title: "Базовая карта Алматы"
  });

  // Создаем объект слоя
  var almaty_layer = new FeatureLayer({
    url: soilURL,
    opacity: 0.85
  });

  var map = new Map({
    layers: [almatyLayer],
    basemap: null
  });

  map.add(almaty_layer); // подгружаем слой к базовой карте

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

  const sketchViewModel = new SketchViewModel({
    layer: sketchLayer,
    defaultUpdateOptions: {
      tool: "reshape",
      toggleToolOnClick: false
    },
    view: view
  });

  // add a GraphicsLayer for the sketches and the buffer
  const sketchLayer = new GraphicsLayer();
  const bufferLayer = new GraphicsLayer();
  view.map.addMany([bufferLayer, sketchLayer]);

  let sceneLayer = null;
  let sceneLayerView = null;
  let bufferSize = 0;

  // Assign scene layer once view is loaded and initialize UI
  view.load().then(function() {
    sceneLayer = view.layers.find(function(layer) {
      return layer.title === "Базовая карта Алматы";
    });
    sceneLayer.outFields = ["buildingMaterial", "yearCompleted"];

    view.whenLayerView(sceneLayer).then(function(layerView) {
      sceneLayerView = layerView;
      queryDiv.style.display = "block";
    });
  });

  view.watch("updating", function(updating) {
    if (!updating) {
      runQuery();
    }
  });

  view.ui.add([queryDiv], "bottom-left");
  view.ui.add([resultDiv], "top-right");

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
    clearHighlighting();
    clearCharts();
    resultDiv.style.display = "none";
  }

  // set the geometry query on the visible SceneLayerView
  var debouncedRunQuery = promiseUtils.debounce(function() {
    if (!sketchGeometry) {
      return;
    }

    resultDiv.style.display = "block";
    updateBufferGraphic(bufferSize);
    return promiseUtils.eachAlways([
      queryStatistics(),
      updateSceneLayer()
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

  // Set the renderer with objectIds
  var highlightHandle = null;
  function clearHighlighting() {
    if (highlightHandle) {
      highlightHandle.remove();
      highlightHandle = null;
    }
  }

  function highlightBuildings(objectIds) {
    // Remove any previous highlighting
    clearHighlighting();
    const objectIdField = sceneLayer.objectIdField;
    document.getElementById("count").innerHTML = objectIds.length;

    highlightHandle = sceneLayerView.highlight(objectIds);
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

  function updateSceneLayer() {
    const query = sceneLayerView.createQuery();
    query.geometry = sketchGeometry;
    query.distance = bufferSize;
    return sceneLayerView.queryObjectIds(query).then(highlightBuildings);
  }

  var yearChart = null;
  var materialChart = null;

  function queryStatistics() {
    const statDefinitions = [
      {
        onStatisticField:
          "CASE WHEN buildingMaterial = 'concrete or lightweight concrete' THEN 1 ELSE 0 END",
        outStatisticFieldName: "material_concrete",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN buildingMaterial = 'brick' THEN 1 ELSE 0 END",
        outStatisticFieldName: "material_brick",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN buildingMaterial = 'wood' THEN 1 ELSE 0 END",
        outStatisticFieldName: "material_wood",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN buildingMaterial = 'steel' THEN 1 ELSE 0 END",
        outStatisticFieldName: "material_steel",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN buildingMaterial IN ('concrete or lightweight concrete', 'brick', 'wood', 'steel') THEN 0 ELSE 1 END",
        outStatisticFieldName: "material_other",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN (yearCompleted >= '1850' AND yearCompleted <= '1899') THEN 1 ELSE 0 END",
        outStatisticFieldName: "year_1850",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN (yearCompleted >= '1900' AND yearCompleted <= '1924') THEN 1 ELSE 0 END",
        outStatisticFieldName: "year_1900",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN (yearCompleted >= '1925' AND yearCompleted <= '1949') THEN 1 ELSE 0 END",
        outStatisticFieldName: "year_1925",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN (yearCompleted >= '1950' AND yearCompleted <= '1974') THEN 1 ELSE 0 END",
        outStatisticFieldName: "year_1950",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN (yearCompleted >= '1975' AND yearCompleted <= '1999') THEN 1 ELSE 0 END",
        outStatisticFieldName: "year_1975",
        statisticType: "sum"
      },
      {
        onStatisticField:
          "CASE WHEN (yearCompleted >= '2000' AND yearCompleted <= '2015') THEN 1 ELSE 0 END",
        outStatisticFieldName: "year_2000",
        statisticType: "sum"
      }
    ];
    const query = sceneLayerView.createQuery();
    query.geometry = sketchGeometry;
    query.distance = bufferSize;
    query.outStatistics = statDefinitions;

    return sceneLayerView.queryFeatures(query).then(function(result) {
      const allStats = result.features[0].attributes;
      updateChart(materialChart, [
        allStats.material_concrete,
        allStats.material_brick,
        allStats.material_wood,
        allStats.material_steel,
        allStats.material_other
      ]);
      updateChart(yearChart, [
        allStats.year_1850,
        allStats.year_1900,
        allStats.year_1925,
        allStats.year_1950,
        allStats.year_1975,
        allStats.year_2000
      ]);
    }, console.error);
  }

  // Updates the given chart with new data
  function updateChart(chart, dataValues) {
    chart.data.datasets[0].data = dataValues;
    chart.update();
  }

  function createYearChart() {
    const yearCanvas = document.getElementById("year-chart");
    yearChart = new Chart(yearCanvas.getContext("2d"), {
      type: "horizontalBar",
      data: {
        labels: [
          "1850-1899",
          "1900-1924",
          "1925-1949",
          "1950-1974",
          "1975-1999",
          "2000-2015"
        ],
        datasets: [
          {
            label: "Build year",
            backgroundColor: "#149dcf",
            stack: "Stack 0",
            data: [0, 0, 0, 0, 0, 0]
          }
        ]
      },
      options: {
        responsive: false,
        legend: {
          display: false
        },
        title: {
          display: true,
          text: "Build year"
        },
        scales: {
          xAxes: [
            {
              stacked: true,
              ticks: {
                beginAtZero: true,
                precision: 0
              }
            }
          ],
          yAxes: [
            {
              stacked: true
            }
          ]
        }
      }
    });
  }
  function createMaterialChart() {
    const materialCanvas = document.getElementById("material-chart");
    materialChart = new Chart(materialCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Concrete", "Brick", "Wood", "Steel", "Other"],
        datasets: [
          {
            backgroundColor: [
              "#FD7F6F",
              "#7EB0D5",
              "#B2E061",
              "#BD7EBE",
              "#FFB55A"
            ],
            borderWidth: 0,
            data: [0, 0, 0, 0, 0]
          }
        ]
      },
      options: {
        responsive: false,
        cutoutPercentage: 35,
        legend: {
          position: "bottom"
        },
        title: {
          display: true,
          text: "Building Material"
        }
      }
    });
  }

  function clearCharts() {
    updateChart(materialChart, [0, 0, 0, 0, 0]);
    updateChart(yearChart, [0, 0, 0, 0, 0, 0]);
    document.getElementById("count").innerHTML = 0;
  }

  createYearChart();
  createMaterialChart();

  view.when(function () {

    // view.ui.add("info", "bottom-left");
    view.ui.add(typeHomeExpand, "bottom-left");

    // executeIdentifyTask() is called each time the view is clicked
    view.on("click", executeIdentifyTask);

    // Create identify task for the specified map service
    identifyTask = new IdentifyTask(soilURL);

    // Параметры для поиска
    params = new IdentifyParameters();
    params.tolerance = 3; //Дистанция от точки клика в пикселях
    params.layerIds = [14]; //Номера слоев где искать
    params.layerOption = "top"; // искать на верхних слоях (IdentifyParameters.LAYER_OPTION_VISIBLE;)
    params.width = view.width; // Размеры видимой карты
    params.height = view.height;

    doQuery();
///////////////////////////////////////////////////////////
    view.ui.add([queryDiv], "bottom-left");
    view.ui.add([resultDiv], "top-right");
///////////////////////////////////////////////////////////
  });

  function makeAjaxCall(address) {
    return $.ajax({
      type: "GET",
      url: 'get_all.php?address=' + encodeURI(address),
      async: false
    }).responseText;
  }

  // Executes each time the view is clicked
  function executeIdentifyTask(event) {
    // Set the geometry to the location of the view click
    params.geometry = event.mapPoint;
    params.mapExtent = view.extent;
    document.getElementById("viewDiv").style.cursor = "wait";

    // This function returns a promise that resolves to an array of features
    // A custom popupTemplate is set for each feature based on the layer it
    // originates from

    identifyTask.execute(params).then(function (response) {

      var results = response.results;

      return results.map(function (result) {
        var feature = result.feature;
        var layerName = result.layerName;
        let currentAddress = feature.attributes['полный адрес'];
        var data = JSON.parse(makeAjaxCall(currentAddress));
        feature.attributes['water'] = data['water'];
        feature.attributes['gas'] = data['gas'];
        feature.attributes['internet'] = data['internet'];
        feature.attributes['heat'] = data['heat'];
        feature.attributes.layerName = layerName;
        if (layerName === 'Здания и сооружения') {
          feature.popupTemplate = { // autocasts as new PopupTemplate()
          title: "Коммунальные службы",
          content: "<div class='esri-feature__fields esri-feature__content-element'>"+
            "<table class='esri-widget__table'>"+
              "<tbody>"+
                  "<tr>"+
                  "<th class='esri-feature__field-header'>Адрес:</th>"+
                  "<td class='esri-feature__field-data'>{полный адрес}</td>"+
                "</tr>"+
                "<tr>"+
                  "<th class='esri-feature__field-header'>Расход воды:</th>"+
                  "<td class='esri-feature__field-data'>{water}</td>"+
                "</tr>"+
                "<tr>"+
                  "<th class='esri-feature__field-header'>Расход газа:</th>"+
                  "<td class='esri-feature__field-data'>{gas}</td>"+
                "</tr>"+

                "<tr>"+
                  "<th class='esri-feature__field-header'>Интернет:</th>"+
                  "<td class='esri-feature__field-data'>{internet}</td>"+
                "</tr>"+
                "<tr>"+
                  "<th class='esri-feature__field-header'>Расход отопления:</th>"+
                  "<td class='esri-feature__field-data'>{heat} </td>"+
                "</tr>"+
              "</tbody>"+
            "</table>"+
          "</div>"
          }


        }

        return feature;

      });
    }).then(showPopup); // Send the array of features to showPopup()

      // Shows the results of the Identify in a popup once the promise is resolved
    function showPopup(response) {
      if (response.length > 0) {
        view.popup.open({
          features: response,
          location: event.mapPoint
        });
      }
      document.getElementById("viewDiv").style.cursor = "auto";
    }
  }

  // Запрос на arcgis
  function doQuery() {

    var sqlTxt;

    sqlTxt = "1=1";

    var qTask = new QueryTask({
      url: queryUrl
    });

    var params = new Query({
      returnGeometry: true,
      outFields: ["name"]
    });

    params.where = sqlTxt;

    qTask.execute(params)
      .then(getResults)
      .catch(promiseRejected);
  } // doQuery

  // Вызывается каждый раз, когда запрос прошел
  function getResults(response) {

    peakResults = response.features;
    addUlLi(peakResults);
    // console.log(peakResults);
    onClickLoader.style.display = 'none';
  }// getResults

  // Вызывается каждый раз, когда запрос отколняется
  function promiseRejected(error) {
    console.error("Promise rejected: ", error.message);
    onClickLoader.style.display = 'none';
  }// promiseRejected

  function addUlLi(e) {
    var info = document.getElementById('info');
    if (e) {
      var ul = document.createElement('ul');
      ul.classList.add('ks-cboxtags');
      // var name = e.attributes.name;
      var li, input, label, k=0;

      for (var i = 0; i < e.length; i++) {
        if (checkName(e[i].attributes.name)) {
          li = document.createElement('li');
          input = document.createElement('input');
          label = document.createElement('label');
          input.type = 'checkbox';
          input.id = k;
          input.setAttribute('for', k);
          input.value = e[i].attributes.name;
          label.id = "label-"+k;
          label.setAttribute('for', k);
          // label.id = k+"label";
          label.innerHTML = e[i].attributes.name;
          li.appendChild(input);
          // label.appendChild(input);
          li.appendChild(label);
          ul.appendChild(li);
          k++;
        }
      }
      addArrayColor(houseTypes);
      info.appendChild(ul);
      checkInputs();
    } else {
      info.innerHTML = 'SORRY';
    }

  }// addUlLi

  function checkName(name) {
    if (name) {
      if (houseTypes.length == 0) {
        houseTypes.push(name);
        return true;
      } else {
        for (var i = 0; i < houseTypes.length; i++) {
          if (houseTypes[i] == name) {
            return false;
          }
        }
        houseTypes.push(name);
        return true;
      }
    } else {
      return false;
    }
  }// checkName


  function checkInputs(){
    var inputs = document.querySelectorAll('li input');

    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('click', checkCheckbox);
    }
  }

  // При нажатии на тип
  function checkCheckbox(e) {
    if (e.path[0].checked){
      createLayer(e.path[0].id, e.path[0].defaultValue);
    } else {
      deleteLayer(e.path[0].id, e.path[0].defaultValue);
    }
  }

  function createLayer(id, name) {

    this["layer"+count] = new GraphicsLayer({
      title: name
    });

    this["layer"+count].addMany(addToLayer(id, this["layer"+count].title));

    map.add(this["layer"+count]);
    count ++;
  }

  // Свойства слоя
  function addToLayer(id, name) {
    var one_types = [];
    var color_symbol = addColor(name);
    addLabelColor(id, color_symbol);
    peakResults.forEach(function(e) {
      if(e.attributes.name === name){
        e.symbol = symbol(color_symbol);
        one_types.push(e);
      }
    });

    return one_types;
  }

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

  // Цвет "кнопки"
  function addLabelColor(id, clr) {
    var label = document.getElementById('label-'+id);
    label.style.backgroundColor = clr;
  }

  function addColor(name){
    var index1 = colors.findIndex(el => el.name === name);
    if(index1 == -1){
      var index2 = colors.findIndex(el => el.name === '');
      colors[index2].name = name;
      return colors[index2].color;
    } else {
      return colors[index1].color;
    }
  }

  function deleteLayer(id, name) {
    deleteLabelColor(id, name);
    map.layers.items.forEach(function(layer) {
      if (layer.title == name){
        map.remove(layer);
      }
    })
    count--;
  }

  function deleteLabelColor(id, name) {
    var label = document.getElementById('label-'+id);
    label.removeAttribute('style');
    deleteColor(name);
  }

  // Удаление типаДома из массива
  function deleteColor(name) {
    var index = colors.findIndex(el => el.name === name);
    colors[index].name = '';
  }

  // Заполнение массива Цветов
  function addArrayColor(hT){
    var k = 0;

    while (hT.length !== colors.length) {
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

});
