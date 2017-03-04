/*eslint-env browser, jquery*/
(function() {
	var possibleItems = [
		'Chicken',
		'Hamburger',
		'Pork Chops',
		'Filet Mignon',
		'Shell Steaks',
		'Flat Iron Steaks',
		'Boneless Short Ribs',
	];
	var addToSelectedItems = function(i) {
		var selectedItemsElt = $('#rpm-selector-selected');
		if (selectedItemsElt.children().length < 5) {
			var selectedItem = $('<div class="rpm-selected-item">' + i + '</div>');
			selectedItem.click(function(e) {
				$(e.target).remove();
			});
			selectedItemsElt.append(selectedItem);
		}
	};
	$.map(possibleItems, function(i) {
		var selectableItem = $('<div class="rpm-selectable-item">' + i + '</div>');
		selectableItem.click(i, function(e) {
			addToSelectedItems(e.data);
		});
		$('#rpm-selector-selectable').append(selectableItem);
	});
})();