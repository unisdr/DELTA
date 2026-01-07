package extractor

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

func TestDecoderExample(t *testing.T) {
	in := `{
			"code":"dialog.hello",
			"desc":"Hello message",
			"msg":"Hello {name}"
		},{name:"test"}) asda sda sd`

	dec := json.NewDecoder(strings.NewReader(in))
	var res Entry
	err := dec.Decode(&res)
	if err != nil {
		panic(err)
	}
	want := Entry{Code: "dialog.hello", Desc: "Hello message", Msg: "Hello {name}"}

	if !reflect.DeepEqual(want, res) {
		t.Errorf("wanted %v, got %v", want, res)
	}
}

const testFile = "f.js"

func TestExtract1(t *testing.T) {
	in := `
function test(){
	let m = t({
			"code":"dialog.hello",
			"desc":"Hello message",
			"msg":"Hello {name}"
		},{name:"test"})
	console.log(m)
}
`
	want := []Entry{
		{
			Location: "f.js:3",
			Code:     "dialog.hello",
			Desc:     "Hello message",
			Msg:      "Hello {name}",
		},
	}

	res, err := ExtractFromContent(testFile, []byte(in))
	if err != nil {
		panic(err)
	}

	if !reflect.DeepEqual(want, res) {
		t.Errorf("wanted %v, got %v", want, res)
	}
}

func TestExtract2(t *testing.T) {
	in := `
function test(){
	let m = t({
			"code":"dialog.hello",
			"desc":"Hello message",
			"msg":"Hello {"
		},{name:"test"})
	console.log(m)
}
`

	want := []Entry{
		{
			Location: "f.js:3",
			Code:     "dialog.hello",
			Desc:     "Hello message",
			Msg:      "Hello {"},
	}

	res, err := ExtractFromContent(testFile, []byte(in))
	if err != nil {
		panic(err)
	}

	if !reflect.DeepEqual(want, res) {
		t.Errorf("wanted %v, got %v", want, res)
	}
}

func TestExtract3(t *testing.T) {
	in := `
function test(){
	let m = text({})
}
`
	var want []Entry

	res, err := ExtractFromContent(testFile, []byte(in))
	if err != nil {
		panic(err)
	}

	if !reflect.DeepEqual(want, res) {
		t.Errorf("wanted %v, got %v", want, res)
	}
}

func TestExtract4(t *testing.T) {
	in := `
function test(){
	let m = t(
		{
			"code":"dialog.hello",
			"desc":"Hello message",
			"msg":"Hello {name}"
		},{name:"test"})
	console.log(m)
}`

	want := []Entry{
		{
			Location: "f.js:3",
			Code:     "dialog.hello",
			Desc:     "Hello message",
			Msg:      "Hello {name}",
		},
	}

	res, err := ExtractFromContent(testFile, []byte(in))
	if err != nil {
		panic(err)
	}

	if !reflect.DeepEqual(want, res) {
		t.Errorf("wanted %v, got %v", want, res)
	}
}
