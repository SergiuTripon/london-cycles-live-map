var app_id = "app_id=ee84c96b";
var app_key = "app_key=3aa60311a1e7234f876e281f65056dbe";
var map;
var zoom = 14;
var london = {lat: 51.5286416, lng: -0.1015987};
var markers = [];
var iw = new google.maps.InfoWindow();

function init_map() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: zoom,
        center: london
    });

    var cycle_layer = new google.maps.BicyclingLayer();
    cycle_layer.setMap(map);

    google.maps.event.addListener(map, "click", function() {
        iw.close();
    });
}

function set_map_on_all(map) {
    $.each(markers, function(key, marker) {
        marker.setMap(map);
    });
}

function clear_markers() {
    set_map_on_all(null);
}

function show_markers() {
    set_map_on_all(map);
}

function delete_markers() {
    clear_markers();
    markers = [];
}

function add_geolocation() {
    if (location.protocol == 'https:') {
        $("#map").append("<div id='geolocation' class='control-custom'><i class='fa fa-map-marker'></i></div>");
        var geolocation = $("#geolocation");
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(geolocation[0]);

        geolocation.click(function () {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    var pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    var marker = new google.maps.Marker({
                        map: map,
                        title: "You are here",
                        position: pos
                    });

                    iw.setPosition(marker.position);
                    iw.setContent(marker.title);
                    map.setZoom(18);
                    map.setCenter(marker.position);
                    iw.open(map, marker);

                    marker.addListener('click', function () {
                        iw.setContent('<div>' + marker.title + '</div>');
                        iw.open(map, marker);
                    });

                }, function () {
                    handleLocationError(true, iw, map.getCenter());
                });
            } else {
                handleLocationError(false, iw, map.getCenter());
            }
            function handleLocationError(browserHasGeolocation, iw, pos) {
                iw.setPosition(pos);
                iw.setContent(browserHasGeolocation ?
                    'Error: The Geolocation service failed.' :
                    'Error: Your browser doesn\'t support geolocation.');
            }
        });
    }
}

function add_search() {
    $("#map").append("<input id='search' class='control-custom' type='text' placeholder='Search'>");
    var input = $("#search")[0];
    var search_box = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    map.addListener('bounds_changed', function() {
        search_box.setBounds(map.getBounds());
    });

    var markers = [];
    search_box.addListener('places_changed', function() {
        var places = search_box.getPlaces();

        if (places.length == 0) {
            return;
        }

        markers.forEach(function(marker) {
            marker.setMap(null);
        });
        markers = [];

        var bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {
            if (!place.geometry) {
                console.log("Returned place contains no geometry");
                return;
            }
            var icon = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(30, 30)
            };

            var marker = new google.maps.Marker({
                map: map,
                icon: icon,
                title: place.name + " | " + place.formatted_address,
                iw_content: "<div><strong>" + place.name + "</strong> | " + place.formatted_address + "</div>",
                position: place.geometry.location,
                anchorPoint: new google.maps.Point(-2, -35)
            });
            markers.push(marker);

            marker.addListener('click', function() {
                iw.setContent('<div>' + marker.iw_content + '</div>');
                iw.open(map, marker);
            });

            if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });
}

function add_copyright() {
    var copyright = document.createElement('div');
    copyright.id = "copyright";

    var copyright_content = document.createElement('div');
    copyright_content.id = "copyright-content";
    copyright_content.innerHTML =
        "<span>Copyright &copy; 2016 " +
        "<a href='http://sergiu-tripon.com/' target='_blank'>Sergiu Tripon</a></span>" +
        "<span class='hidden-xs'>. Code licensed under " +
        "<a href='" + license_path + "' target='_blank'>MIT License</a>.</span>"
    ;
    copyright.appendChild(copyright_content);

    copyright.index = -1;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(copyright);
}

function get_status(marker) {
    $.ajax({
        url: "https://api.tfl.gov.uk/BikePoint/" + marker.id + "?" + "&" + app_id + "&" + app_key
    }).then(function(bike_point) {
        var docking_station = bike_point.commonName;
        var installed_status = ((bike_point.additionalProperties[1].value == "true") ? "Yes" : "No");
        var locked_status = ((bike_point.additionalProperties[2].value == "true") ? "Yes" : "No");
        var available_bikes = parseInt(bike_point.additionalProperties[6].value);
        var empty_docks = parseInt(bike_point.additionalProperties[7].value);
        var total_docks = parseInt(bike_point.additionalProperties[8].value);
        var broken_docks = total_docks - (available_bikes + empty_docks);

        var modal_status = $("#modal-status");
        modal_status.html('');
        var modal_content_status = "<div class='modal-dialog modal-lg' role='document'>";
        modal_content_status +=
            "<div class='modal-content'>" +
            "<div class='modal-header'>" +
            "<button type='button' class='close' data-dismiss='modal' aria-label='Close'>" +
            "<span class='fa fa-times' aria-hidden='true'></span>" +
            "</button>" +
            "<div class='container-fluid'>" +
            "<div class='row'>" +
            "<div class='col-lg-12'>" +
            "<h1>" + docking_station + "</h1>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>"
        ;
        modal_content_status +=
            "<div class='modal-body'>" +
            "<div class='container-fluid'>" +
            "<div class='row'>"
        ;
        modal_content_status +=
            "<div class='col-sm-6 col-md-6 col-lg-6'>" +
            "<div class='item-status'>" +
            "<h4>Installed</h4>" +
            "<h4>" + installed_status  + "</h4>" +
            "</div>" +
            "</div>" +
            "<div class='col-sm-6 col-md-6 col-lg-6'>" +
            "<div class='item-status'>" +
            "<h4>Locked</h4>" +
            "<h4>" + locked_status + "</h4>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "<div class='row'>" +
            "<div class='col-sm-6 col-md-3 col-lg-3'>" +
            "<div class='item-status'>" +
            "<h4>Available Bikes</h4>" +
            "<h4>" + available_bikes + "</h4>" +
            "</div>" +
            "</div>" +
            "<div class='col-sm-6 col-md-3 col-lg-3'>" +
            "<div class='item-status'>" +
            "<h4>Empty Docks</h4>" +
            "<h4>" + empty_docks + "</h4>" +
            "</div>" +
            "</div>" +
            "<div class='col-sm-6 col-md-3 col-lg-3'>" +
            "<div class='item-status'>" +
            "<h4>Total Docks</h4>" +
            "<h4>" + total_docks + "</h4>" +
            "</div>" +
            "</div>" +
            "<div class='col-sm-6 col-md-3 col-lg-3'>" +
            "<div class='item-status'>" +
            "<h4>Broken Docks</h4>" +
            "<h4>" + broken_docks + "</h4>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>"
        ;
        modal_content_status +=
            "<div class='modal-footer'>" +
            "<div class='container-fluid'>" +
            "<div class='row'>" +
            "<div class='col-lg-12'>" +
            "<button type='button' class='btn btn-red btn-md' data-dismiss='modal'>" +
            "Close <i class='fa fa-times'></i>" +
            "</button>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>"
        ;
        modal_status.append(modal_content_status);
        modal_status.modal("show");
    });
}

function plot_markers(data) {
    $.each(data, function(key, val) {
        var marker = new google.maps.Marker({
            map: map,
            id: val.id,
            title: val.commonName,
            icon: cycle_image_path,
            position: {lat: val.lat, lng: val.lon}
        });
        markers.push(marker);

        google.maps.event.addListener(marker, 'click', function() {
            iw.close();
            get_status(marker);
        });
    });
}

function get_markers() {
    $.ajax({
        url: "https://api.tfl.gov.uk/BikePoint/" + "?" + "&" + app_id + "&" + app_key
    }).then(function(bike_points) {
        plot_markers(bike_points);
    })
}

$(function() {
    init_map();
    get_markers();
    add_geolocation();
    add_search();
    add_copyright();
});