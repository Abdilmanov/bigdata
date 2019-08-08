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
  // "esri/widgets/Slider",
  "esri/geometry/geometryEngine",
  "esri/Graphic",
  "esri/core/promiseUtils"
], function (
  Map, MapView, FeatureLayer, IdentifyTask, IdentifyParameters, TileLayer,
  QueryTask, Query, GraphicsLayer, Expand, SketchViewModel, geometryEngine,
  Graphic, promiseUtils
) {
  // URL to the map service where the identify will be performed
  var soilURL = "https://gis.uaig.kz/server/rest/services/Map2d/объекты_города3/MapServer/14";
  var gisBasemapUrl = "https://gis.uaig.kz/server/rest/services/BaseMapAlm_MIL1/MapServer";
  // var queryUrl = "https://gis.uaig.kz/server/rest/services/BaseMapAlm_MIL1/MapServer/13";
  var queryUrl = "https://gis.uaig.kz/server/rest/services/Map2d/Buildings0307/MapServer/0";
  var identifyTask, params, almatyLayer, resultsLayer, houseTypes = [], peakResults,
      colors = [];

  // Добавление слоев
  resultsLayer = new GraphicsLayer({
    title: "Тип объекта"
  });

  almatyLayer = new TileLayer({
    url: gisBasemapUrl,
    title: "Ком услуги"
  });

  var map = new Map({
    layers: [almatyLayer],
    basemap: null
  });

  var view = new MapView({
    container: "viewDiv",  // Reference to the scene div created in step 5
    map: map,  // Reference to the map object created before the scene
    scale: 10000,
    center: [76.910, 43.220]  // Sets center point of view using longitude,latitude (Алматы)
  });

  var typeHomeExpand = new Expand({
    view: view,
    autoCollapse: true,
    content: document.getElementById('homeTypes'),
    expandIconClass: "esri-icon-organization",
    expandTooltip: "Отобразить типы зданий",
    id: "homeExpand",
    expanded: true
  });

  var geometryDrawExpand = new Expand({
    view: view,
    content: document.getElementById('queryDiv'),
    expandIconClass: "esri-icon-authorize",
    expandTooltip: "Узнать данные по области",
    id: "drawExpand",
    expanded: true
  });

  view.when(function () {
    let info = document.getElementById('info');
    let dataInfo = document.getElementById('dataInfo');
    let queryDiv = document.getElementById('queryDiv');
    let homeTypes = document.getElementById('homeTypes');
    let menuItemHome = document.getElementById('menuItemHome');
    let menuItemGraphic = document.getElementById('menuItemGraphic');
    let closeGraphic = document.getElementById('closeGraphic');

    view.ui.add(info, "top-left");

    info.style.display = 'block';
    // view.ui.add(typeHomeExpand, "top-left");
    // view.ui.add(geometryDrawExpand, "top-left");
    // view.ui.add("dataInfo", "top-left");

    addUlLi();

    document.getElementById('closeHome').addEventListener('click', function() {
      homeTypes.style.display = 'none';
      menuItemHome.classList.remove('active');
    })
    document.getElementById('closeGraphic').addEventListener('click', function() {
      if (dataInfo.style.display == 'inherit') {
        dataInfo.style.display = 'none';
      }
      queryDiv.style.display = 'none';
      menuItemGraphic.classList.remove('active');
    })
    // closeGraphic.addEventListener('click', function() {
    //   if (dataInfo.style.display == 'inherit') {
    //     dataInfo.style.display = 'none';
    //   }
    //   queryDiv.style.display = 'none';
    // })
    menuItemHome.addEventListener('click', function() {
      if (queryDiv.style.display == 'inherit') {
        menuItemGraphic.classList.remove('active');
        queryDiv.style.display = 'none';
      }
      menuItemHome.classList.add('active');
      homeTypes.style.display = 'inherit';
    })
    menuItemGraphic.addEventListener('click', function() {
      if (homeTypes.style.display == 'inherit') {
        menuItemHome.classList.remove('active');
        homeTypes.style.display = 'none';
        if (dataInfo.style.display == 'inherit') {
          dataInfo.style.display = 'none';
        }
      }
      menuItemGraphic.classList.add('active');
      queryDiv.style.display = 'inherit';
    })

  });

  function makeAjaxCall(address) { //???
    return $.ajax({
      type: "GET",
      url: 'get_all.php?address=' + encodeURI(address),
      async: false
    }).responseText;
  }

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

    if (response.features.length == 0) {
      findNothing();
      return;
    } else {
      let color = addColor(response.features[0].attributes.name);

      peakResults = response.features.map(function(feature) {
        feature.symbol = symbol(color);
        return feature;
      });

      createLayer(peakResults[0].attributes.name, findNameValue(peakResults[0].attributes.name));
    }
  }

  // Вызывается каждый раз, когда запрос отколняется
  function promiseRejected(error) {
    console.error("Promise rejected: ", error.message);
    onClickLoader.style.display = 'none';
  }

  // Если ничего не найдено
  const findNothing = () => {
    element.checked = false;
    onClickLoader.style.display = 'none';
    alert('Данный тип здания не найден, отдалите карту или переместитесь по ней в другое место и попробуйте еще раз');
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
    var homeTypes = document.getElementById('homeTypes');
    var div = document.createElement('div');
    var span = document.createElement('span');
    span.setAttribute('id', 'closeHome');
    span.setAttribute('class', 'text');
    span.classList.add('close');
    span.innerHTML = 'x';
    div.setAttribute('id', 'home');
    div.setAttribute('class', 'homeText');
    div.innerHTML = 'Нажмите на тип здания, которое вас интересует';
    var ul = document.createElement('ul');
    ul.classList.add('ks-cboxtags');

    var li, input, label, id, value;

    homeType.forEach((el) => {
      id = el.name;
      value = el.value;
      li = document.createElement('li');
      b = document.createElement('b');
      br = document.createElement('br');
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
      if (el.title) {
        label.setAttribute('title', el.title);
      }
      li.appendChild(input);
      // label.appendChild(input);
      li.appendChild(label);
      ul.appendChild(li);
    })

    addArrayColor(homeType.length);
    b.appendChild(div);
    b.appendChild(span);
    homeTypes.appendChild(b);
    homeTypes.appendChild(ul);
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

  var element; // Нажатый элемент
  // При нажатии на тип
  function checkCheckbox(e) {
    element = e.toElement;
    if (element.checked) {
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
  function addColor(id) {
    var index1 = colors.findIndex(el => el.name === id);
    if (index1 == -1) {
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
  // const bufferLayer = new GraphicsLayer();
  view.map.add(sketchLayer);
  // view.map.addMany([bufferLayer, sketchLayer]);

  var data = [], water = 0, gas = 0, internet = '', heat = 0, address = '';
  // let bufferSize = 0;

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
    console.log(event);
    if (event.state === "complete") {
      sketchGeometry = event.graphic.geometry;
      runQuery();
    }
  });

  sketchViewModel.on("update", function(event) {
    console.log(event);
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
    switch (geometryType) {
      case 'point':
        checkActive('line');
        checkActive('polygon');
        document.getElementById('point-geometry-button').classList.add('active');
        break;
      case 'polyline':
        checkActive('point');
        checkActive('polygon');
        document.getElementById('line-geometry-button').classList.add('active');
        break;
      case 'polygon':
        checkActive('point');
        checkActive('line');
        document.getElementById('polygon-geometry-button').classList.add('active');
        break;
    }

    clearGeometry();
    sketchViewModel.create(geometryType);
    console.log(sketchViewModel);
    console.log(sketchLayer);
  }

  const checkActive = a => {
    switch (a) {
      case 'point':
        document.getElementById('point-geometry-button').classList.remove('active');
        break;
      case 'line':
        document.getElementById('line-geometry-button').classList.remove('active');
        break;
      case 'polygon':
        document.getElementById('polygon-geometry-button').classList.remove('active');
        break;
    }

  }
  // const bufferNumSlider = new Slider({
  //   container: "bufferNum",
  //   min: 0,
  //   max: 500,
  //   steps: 1,
  //   labelsVisible: true,
  //   precision: 0,
  //   labelFormatFunction: function(value, type) {
  //     return value.toString() + "m";
  //   },
  //   values: [0]
  // });
  // get user entered values for buffer
  // bufferNumSlider.on("value-change", bufferVariablesChanged);
  // bufferNumSlider.on("thumb-drag", bufferVariablesChanged);
  // function bufferVariablesChanged(event) {
  //   if (event.state == "stop") {
  //     bufferSize = event.value;
  //     data = [], water = 0, gas = 0, internet = '', heat = 0, address = '';
  //     runQuery();
  //   }
  // }
  // Clear the geometry and set the default renderer
  document
    .getElementById("clearGeometry")
    .addEventListener("click", clearGeometry);

  // Clear the geometry and set the default renderer
  function clearGeometry() {
    document.getElementById('dataInfo').style.display = "none";
    let activeButton = document.querySelector('button active');
    if (activeButton) {
      console.log(this);
    }
    data = [], water = 0, gas = 0, internet = '', heat = 0, address = '';
    sketchGeometry = null;
    sketchViewModel.cancel();
    sketchLayer.removeAll();
    // bufferLayer.removeAll();
  }

  // set the geometry query on the visible SceneLayerView
  var debouncedRunQuery = promiseUtils.debounce(function() {
    if (!sketchGeometry) {
      return;
    }

    // updateBufferGraphic(bufferSize);//???
    return promiseUtils.eachAlways([
      queryStatistics()
    ]);
  });

  function runQuery() {
    debouncedRunQuery()
      .catch((error) => {
      if (error.name === "AbortError") {
        return;
      }

      console.error(error);
    });
  }

  // update the graphic with buffer
  // function updateBufferGraphic(buffer) {
  //   // add a polygon graphic for the buffer
  //   if (buffer > 0) {
  //     var bufferGeometry = geometryEngine.geodesicBuffer(
  //       sketchGeometry,
  //       buffer,
  //       "meters"
  //     );
  //     if (bufferLayer.graphics.length === 0) {
  //       bufferLayer.add(
  //         new Graphic({
  //           geometry: bufferGeometry,
  //           symbol: sketchViewModel.polygonSymbol
  //         })
  //       );
  //     } else {
  //       bufferLayer.graphics.getItemAt(0).geometry = bufferGeometry;
  //     }
  //   } else {
  //     bufferLayer.removeAll();
  //   }
  // }

  // запрос по зданию(-ям)
  function queryStatistics() {
    onClickLoader.style.display = 'inline-block';
    document.getElementById('dataInfo').style.display = "none";
    var qTask = new QueryTask({
      url: queryUrl
    });

    var params = new Query({
      returnGeometry: true,
      geometry: sketchGeometry,
      // distance: bufferSize,
      outFields: ["address"]
    });
    // console.log(bufferLayer);
    qTask.execute(params)
      .then(getResults)
      .catch(promiseRejected);

      // Вызывается каждый раз, когда запрос прошел
      function getResults(response) {
        if (!response.features) {
          alert("В этой зоне нет зданий.\nВыделите другое место и попробуйте еще раз.");
          clearGeometry();
          onClickLoader.style.display = 'none';
          return;
        }
        let currentAddress, index = 0;
        response.features.map(function(feature) {
          if (checkReAddress(data, feature.attributes.address)) {
            currentAddress = feature.attributes.address;
            data[index] = JSON.parse(makeAjaxCall(currentAddress));
            data[index].address = currentAddress;
            index++;
          }
        });
        setData(data);
        document.getElementById('dataInfo').style.display = "inherit";
        geometryDrawExpand.expanded = false;
        onClickLoader.style.display = 'none';
      }

      // Вызывается каждый раз, когда запрос отколняется
      function promiseRejected(error) {
        console.error("Promise rejected: ", error.message);
        onClickLoader.style.display = 'none';
      }

      const checkReAddress = (data, address) => {
        let check;
        if (!data) return true;
        data.forEach((el) => {
          if (el.address === address) {
            check = true;
            return;
          };
        })
        if (check) {
          return false;
        } else {
          return true;
        }
      }

      const setData = data => {
        let w = 0, g = 0, i = 0, h = 0;
        data.forEach((el, index) => {
          if (index == 0) {
            address += el.address;
          } else {
            address += '; ' + el.address;
          }

          if (Number(el.water)) {
            water += Number(el.water);
            w++;
          }
          if (Number(el.gas)) {
            gas += Number(el.gas);
            g++;
          }
          if (el.internet !== 'Данных по этому дому нет') {
            if (index == 0 || !internet) {
              internet += el.internet;
            } else {
              internet += '; ' + el.internet;
            }
            i++;
          }
          if (Number(el.heat)) {
            heat += Number(el.heat);
            h++;
          }
        });

        document.getElementById('address').innerHTML = address;

        if (w > 0) {
          document.getElementById('water').innerHTML = water;
        } else {
          document.getElementById('water').innerHTML = 'Данных по этому дому нет';
        }
        if (g > 0) {
          document.getElementById('gas').innerHTML = gas;
        } else {
          document.getElementById('gas').innerHTML = 'Данных по этому дому нет';
        }

        if (i > 0) {
          document.getElementById('internet').innerHTML = internet;
        } else {
          document.getElementById('internet').innerHTML = 'Данных по этому дому нет';
        }
        if (h > 0) {
          document.getElementById('heat').innerHTML = heat;
        } else {
          document.getElementById('heat').innerHTML = 'Данных по этому дому нет';
        }

      }

  }

  //----------------------------------------------------------------

});
