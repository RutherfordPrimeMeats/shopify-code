$(document).ready(_ => {

    let PACKAGES = {
        'Summer Sizzler BBQ Box': [
            '5 lbs of 6 oz burgers',
            '5 lbs of Thumanns Hot Dogs',
            '5 lbs boneless chicken breast',
            '3 Slabs of Baby Back Ribs'
        ],
        "Father's Day Package": [
            '6 pieces of 12 oz Boneless NY Strip Steaks',
            '3 Racks of Baby Back Ribs',
            '10 8 oz Blue Ribbon Burgers (Short Rib/Brisket/Chuck blend)'
        ],
        'Tailgate Party Package': [
            '5 lbs of 6 oz Beef Burgers',
            '5 lbs of Sweet Sausage',
            '5 lbs of Chicken Breast',
            '5 lbs of Thumanns Hot Dogs',
            '5 lbs of Macaroni Salad',
            '5 lbs of Potato Salad',
            '5 lbs of Cole Slaw'
        ],
        'Firecracker July 4th Package': [
            '3 Racks of Baby Back Ribs',
            '5 lbs of Blue Ribbon Sliders (40 individual sliders)',
            '10 lbs of 6 oz Blue Ribbon Burgers (26 individual burgers)',
            "5 lbs of Nathan's All-Beef Hot Dog (30 individual hot dogs)",
            '5 lbs Sweet Sausage'
        ]
    }

    let getAllDates = function () {
        let dates = new Set();
        window._ORDER_DATA.orders.map(order => {
            order.note_attributes.map(attr => {
                if (attr.name == "pickup-date" || attr.name == "delivery-date") {
                    dates.add(attr.value);
                }
            });
        });
        return dates;
    };

    let getFutureDates = function () {
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

    let getOrdersForDate = function (date) {
        let orders = [];
        window._ORDER_DATA.orders.map(order => {
            if (order.fulfillment_status == 'fulfilled') {
                return;
            }
            order.note_attributes.map(attr => {
                if (attr.name == "pickup-date" || attr.name == "delivery-date") {
                    if (attr.value == date) {
                        orders.push(order);
                    }
                }
            });
        });
        return orders;
    };

    let getProductsForOrders = function (orders) {
        let products = {};
        orders.map(order => {
            order.line_items.map(line_item => {
                products[line_item.title] = (products[line_item.title] || 0) + 1;
                // If this is a 5 for $55, also include the sub-items.
                if (line_item.title.includes('Survival Package')) {
                    let subs = line_item.properties[0].value.split(', ');
                    subs.map(sub => {
                        products[sub] = (products[sub] || 0) + 1;
                    });
                }
                // Other packages.
                if (line_item.title in PACKAGES) {
                    PACKAGES[line_item.title].map(sub => {
                        products[sub] = (products[sub] || 0) + 1;
                    })
                }
            });
        });
        return products;
    };

    let displayProducts = function (products) {
        $("#products").html('');
        let table = $(`<table><thead><tr><th>Product</th><th>Quantity</th>
        </tr></thead><tbody></tbody></table>`);
        $("#products").append(table);

        let names = [];
        $.each(products, product => { names.push(product); });
        names.sort();
        names.map(name => {
            let row = $('<tr><td>' + name + '</td><td>' + products[name] + '</td></tr>');
            $("#products table tbody").append(row);
        });
    };

    let getDeliveryByType = function (orders, type) {
        let ret = [];
        orders.map(order => {
            order.note_attributes.map(attr => {
                if (attr.name == 'location' && attr.value == type) {
                    ret.push(order);
                }
            });
        });
        return ret;
    };

    let getDeliveryAddress = function (order) {
        let ret = '';
        order.note_attributes.map(attr => {
            if (attr.name == 'delivery-address') {
                ret = attr.value;
            }
        });
        return ret;
    };

    let getLineItemHTML = function (order) {
        let items = [];
        order.line_items.map(line => {
            let text = line.title;
            if (text.includes('Survival Package')) {
                text += `<div class="package">${line.properties[0].value}</div>`;
            }
            if (text in PACKAGES) {
                text += `<div class="package">${PACKAGES[text].join(', ')}</div>`
            }
            items.push(`<li>${text}</li>`);
        });
        return `<ul>${items.join('')}</ul>`;
    };

    let getOrdersByType = function (orders, type) {
        orders = getDeliveryByType(orders, type);
        if (orders.length == 0) {
            return;
        }
        let ret = $(`<table><thead><tr><th>ID</th><th>Customer</th><th>Products</th>
        <th>Address / Note</th></tr></thead><tbody></tbody></table>`);
        orders.map(order => {
            let row = $('<tr></tr>');
            row.append($(`<td>${order.name}</td>`));
            row.append($(`<td>${order.customer.first_name} ${order.customer.last_name}</td>`));
            row.append($(`<td>${getLineItemHTML(order)}</td>`));
            row.append($(`<td><div>${getDeliveryAddress(order)}</div>
            <div class="note">${order.note}</div></td>`));
            ret.append(row);
        });
        return ret;
    };

    let displayOrders = function (orders) {
        $("#orders").html('');
        let deliveries = getOrdersByType(orders, 'home');
        if (deliveries) {
            $("#orders").append($('<h2>Deliveries</h2>'));
            $("#orders").append(deliveries);
        }
        let masons = getOrdersByType(orders, 'mason');
        if (masons) {
            $("#orders").append($('<h2>Mason\'s</h2>'));
            $("#orders").append(masons);
        }
    };

    let switchDate = function () {
        let date = $(this).val();
        let orders = getOrdersForDate(date);
        let products = getProductsForOrders(orders);
        displayProducts(products);
        displayOrders(orders);
    };

    let setUnfulfilledPrice = function () {
        let price = 0;
        window._ORDER_DATA.orders.map(order => {
            if (order.fulfillment_status == "") {
                price += Number.parseFloat(order.total_price);
            }
        });
        $("#unfulfilled_price").text(`$${price.toFixed(2)}`);
    };

    let setLastUpdated = function () {
        $("#last_updated").text(window._GEN_DATE);
    };

    let setUpDateDropDown = function () {
        let futureDates = getFutureDates().sort();
        $.each(futureDates, function (idx, date) {
            $('#date_picker')
                .append($("<option></option>")
                    .attr("value", date)
                    .text(date));
        });
        $('#date_picker').change(switchDate);
    };

    setUpDateDropDown();
    setLastUpdated();
    setUnfulfilledPrice();

});
