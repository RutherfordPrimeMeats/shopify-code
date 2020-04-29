var getAllDates = function() {
    let dates = new Set();
    window._ORDER_DATA.orders.map(order => {
        order.note_attributes.map(attr => {
            if (attr.name=="pickup-date" || attr.name=="delivery-date") {
                dates.add(attr.value);
            }
        });
    });
    return dates;
};

let getFutureDates = function() {
    let dates = getAllDates();
    let futureDates = [];
    let yesterday = new Date((new Date()) - 86400000);
    dates.forEach(date => {
        let split = date.split('/');
        let f = Date.parse(split[2] + '-' + split[0] + '-' + split[1]);
        if (f >= yesterday) {
            futureDates.push(date);
        }
    });
    return futureDates;
};

let getOrdersForDate = function(date) {
    let orders = [];
    window._ORDER_DATA.orders.map(order => {
        order.note_attributes.map(attr => {
            if (attr.name=="pickup-date" || attr.name=="delivery-date") {
                if (attr.value == date) {
                    orders.push(order);
                }
            }
        });
    });
    return orders;
};

let getProductsForOrders = function(orders) {
    let products = {};
    orders.map(order => {
        order.line_items.map(line_item => {
            products[line_item.title] = (products[line_item.title] || 0) + 1;
            // If this is a 5 for $55, also include the sub-items.
            if (line_item.title == "5 for $55 Survival Package") {
                let subs = line_item.properties[0].value.split(', ');
                subs.map(sub => {
                    products[sub] = (products[sub] || 0) + 1;
                });
            }
        });
    });
    return products;
};

let displayProducts = function (products) {
    $("#products").html('');
    let table = $("<table><thead><tr><th>Product</th><th>Quantity</th></tr></thead><tbody></tbody></table>");
    $("#products").append(table);
    
    let names = [];
    $.each(products, product => { names.push(product); });
    names.sort();
    names.map(name => {
        let row = $('<tr><td>'+name+'</td><td>'+products[name]+'</td></tr>');
        $("#products table tbody").append(row);
    });
};

let switchDate = function() {
    let date = $(this).val();
    console.log(date);
    let orders = getOrdersForDate(date);
    console.log(orders);
    let products = getProductsForOrders(orders);
    console.log(products);
    displayProducts(products);
};

let ready = function() {
    let futureDates = getFutureDates().sort();
    $.each(futureDates, function(idx, date) {
        $('#date_picker')
            .append($("<option></option>")
                       .attr("value", date)
                       .text(date));
    });
    $('#date_picker').change(switchDate);
    $("#last_updated").text(window._GEN_DATE);
};

$(document).ready(ready);