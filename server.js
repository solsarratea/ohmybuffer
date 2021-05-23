const express = require('express');
const app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(express.static(__dirname + '/public'))
app.use(express.static(__dirname + '/src'))
app.use(express.static(__dirname + '/views'))
app.use(express.static(__dirname + '/node_modules/socket.io'))

const listener = server.listen(process.env.PORT, () => {
  console.log("Your app is listening at port : " + server.address().port);
});

io.sockets.on('connection',
  function (socket) {
      console.log("New client: " + socket.id);

    socket.on('hello',
      function(data) {
        socket.broadcast.emit('hello', data);
      }
    );
  
    socket.on('offer',
      function(data) {
		  socket.broadcast.emit('offer', data);
      }
    );
    socket.on('answer',
      function(data) {
          socket.broadcast.emit('answer', data);
          console.log("success!")
      }
    );
  
    socket.on('candidate',
      function(data) {
        socket.broadcast.emit('candidate', data);
      }
    );

    socket.on('diffusionRate',
      function(data) {
        socket.broadcast.emit('diffusionRate', data);
      }
    );
    
    socket.on('interpolate',
      function(data) {
        socket.broadcast.emit('interpolate', data);
    }
    );
  
   socket.on('sharp',
      function(data) {
        socket.broadcast.emit('sharp', data);
    }
  );

    
  socket.on('disconnect', function() {
    console.log("Client has disconnected");
  });
 });

