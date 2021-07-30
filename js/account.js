$(document).ready(function(){

	$('#deleteUser').on('click', function(){
		$.ajax({
			type: 'DELETE',
			url: '/deleteUser',
		});

		window.location.replace('/login');
	});
});