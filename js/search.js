$(document).ready(function(){

	function search()
	{
		const expression = $('#searchExpression').val();
		window.location.replace('/gallery?search='+expression);
	}

	$('#submit').on('click', search);
});