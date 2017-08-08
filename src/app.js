var React = require('react');
var axios = require('axios');

var Prompt = 'fc@aliyun $ ';
var ShellApi = 'http://api.rockuw.com/shell';

var App = React.createClass({
  getInitialState: function() {
    this.offset = 0
    this.cmds = []

    return {
      history: [],
      prompt: Prompt,
    }
  },
  clearHistory: function() {
    this.setState({ history: [] });
  },
  execShellCommand: function(cmd) {
    var that = this;
    that.setState({'prompt': ''})
    that.offset = 0
    that.cmds.push(cmd)
    axios.get(ShellApi+'?cmd=' + encodeURIComponent(cmd)).then(function (res) {
      console.log(res);
      (res.data+'').split('\n').forEach(function(line) {
        that.addHistory(line);
      });
      that.setState({'prompt': Prompt})
    }).catch(function(err) {
      var errText = '';
      if (err.response) {
        // TODO should print the request id, however api gateway
        // doesn't support it yet
        errText = err.response.status + ' ' + err.response.statusText
      } else {
        errText = err.toString();
      }
      that.addHistory(errText);
      that.setState({'prompt': Prompt})
    });
  },
  showWelcomeMsg: function() {
    this.addHistory('Welcome to FunctionCompute! Have fun!');
  },
  openLink: function(link) {
    return function() {
      window.open(link, '_blank');
    }
  },
  componentDidMount: function() {
    var term = this.refs.term.getDOMNode();

    this.showWelcomeMsg();
    term.focus();
  },
  componentDidUpdate: function() {
    var el = React.findDOMNode(this);
    //var container = document.getElementsByClassName('container')[0];
    var container = document.getElementById("main");
    container.scrollTop = el.scrollHeight;
  },
  handleInput: function(e) {
    switch (e.key) {
      case "Enter":
        var input_text = this.refs.term.getDOMNode().value;
        var input_array = input_text.split(' ');
        var input = input_array[0];
        var arg = input_array[1];

        this.addHistory(this.state.prompt + " " + input_text);
        this.execShellCommand(input_text);
        this.clearInput();
        break
      case 'ArrowUp':
        if (this.offset === 0) {
          this.lastCmd = this.refs.term.getDOMNode().value
        }

        this.refs.term.getDOMNode().value = this.cmds[this.cmds.length - ++this.offset] || this.cmds[(this.offset = this.cmds.length, 0)] || this.lastCmd
        return false
      case 'ArrowDown':
        var history = this.state.history.slice(1)

        this.refs.term.getDOMNode().value = this.cmds[this.cmds.length - --this.offset] || (this.offset = 0, this.lastCmd)
        return false
    }
  },
  clearInput: function() {
    this.refs.term.getDOMNode().value = "";
  },
  addHistory: function(output) {
    var history = this.state.history;
    history.push(output)
    this.setState({
      'history': history
    });
  },
  handleClick: function() {
    var term = this.refs.term.getDOMNode();
    term.focus();
  },
  render: function() {
    var output = this.state.history.map(function(op, i) {
      return <p key={i}>{op}</p>
    });
    return (
      <div className='input-area' onClick={this.handleClick}>
        {output}
        <p>
          <span className="prompt">{this.state.prompt}</span>
          <input type="text" onKeyDown={this.handleInput} ref="term" />
        </p>
      </div>
    )
  }
});

// render it dawg!
var AppComponent = React.createFactory(App);
React.render(AppComponent(), document.getElementById('app'));
