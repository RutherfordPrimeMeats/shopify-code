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
