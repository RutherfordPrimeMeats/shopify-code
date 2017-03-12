/*eslint-env browser, jquery*/
(function() {
	var possibleItems = [
		'4 Flat Iron Steaks',
		'4 Beef Burgers',
		'2.5 lbs Thin Sliced Antibiotic-Free Chicken',
		'2.5 lbs Antibiotic-Free Ground Turkey',
		'4 Pork Chops',
		'2 lbs Beef Cubes (for stews/ kebobs)',
		'3.5 lb 8-Way Cut Up Chicken',
		'2 lbs Pork Shoulder',
		'2 lbs Pork Tenderloin',
	];
	
	var resetSelectedItemText = function() {
		var selectedItemsElt = $('#rpm-selector-selected');
		var selectedText = [];
		$.map(selectedItemsElt.children(), function(elt) {
			selectedText.push($(elt).text());
		});
		$('#rpm-selected-input').val(selectedText.join(', '));
	};
	
	var addToSelectedItems = function(i) {
		var selectedItemsElt = $('#rpm-selector-selected');
		if (selectedItemsElt.children().length >= 5) {
			return;
		}

		var selectedItem = $('<div class="rpm-selected-item">' + i + '</div>');
		selectedItem.click(function(e) {
			$(e.target).remove();
			resetSelectedItemText();
		});
		selectedItemsElt.append(selectedItem);
		
		resetSelectedItemText();
	};
	
	$.map(possibleItems, function(i) {
		var selectableItem = $('<div class="rpm-selectable-item">' + i + '</div>');
		selectableItem.click(i, function(e) {
			addToSelectedItems(e.data);
		});
		$('#rpm-selector-selectable').append(selectableItem);
	});
	
})();
