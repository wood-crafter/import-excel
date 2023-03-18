import React, { useState, useRef, useContext, useEffect } from 'react'
import * as XLSX from 'xlsx/xlsx.mjs';
import {Table, Form, Input, Space} from "antd";
import './App.css';

const EditableContext = React.createContext(null);

function EditableRow({index, ...props}) {
  const [form] = Form.useForm();

  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  )
}

function EditableCell({title, editable, children, dataIndex, record, handleSave, ...restProps}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);
  const form = useContext(EditableContext);

  useEffect(() => {
    if (editing) {
      inputRef.current.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({ [dataIndex]: record[dataIndex] });
  };

  const save = async () => {
    try {
      const values = await form.validateFields();

      toggleEdit();
      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  let childNode = children;

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{ margin: 0 }}
        name={dataIndex}
      >
        <Input ref={inputRef} onPressEnter={save} onBlur={save} />
      </Form.Item>
    ) : (
      <div className="editable-cell-value-wrap" style={{ paddingRight: 24, paddingLeft: 24 }} onClick={toggleEdit}>
        {children}
      </div>
    );
  }

  return <td {...restProps}>{childNode}</td>;
}

// function dummyConverter(jsonSheet) {
//   return jsonSheet.map(item => {
//     return {
//       순서: item.순서,
//       출발지: item.출발지,
//       도착지: item.도착지
//     }
//   })
// }

function App(props) {
  const [selectedFile, setSelectedFile] = useState();
	const [isFilePicked, setIsFilePicked] = useState(false);
  const [selectedSheetName, setSelectedSheetName] = useState();
  const [sheetData, setSheetData] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [columns, setColumns] = useState([]);

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  };

  function handleSave(row) {
    const newData = [...dataSource];
    const index = newData.findIndex((item) => row.key === item.key);
    const item = newData[index];
    newData.splice(index, 1, {
      ...item,
      ...row,
    });
    setDataSource(newData);
  };

  const changeHandler = async (event) => {
    const dataBuffer = await (event.target.files[0].arrayBuffer());

    readDataFromExcel(dataBuffer);
    setSelectedFile(event.target.files[0]);
		setIsFilePicked(true);
  };

  const readDataFromExcel = (data) => {
    const wb = XLSX.read(data);
    setSelectedSheetName(wb.SheetNames);
    let sheetData = {};
    let sheetName = wb.SheetNames[0];

    const worksheet = wb.Sheets[sheetName];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: ''});
    // if (props.converter) {
      jsonData = dummyConverter(XLSX.utils.sheet_to_json(worksheet, { defval: ''}));
    // }
    // if (props.converter) {
    //   jsonData = props.converter(XLSX.utils.sheet_to_json(worksheet, { defval: ''}));
    // }
    const jsonHeader = XLSX.utils.sheet_to_json(worksheet, { header: 1 ,defval: ''})[0].filter(item => {
      return jsonData[0].hasOwnProperty(item);
    });

    const nextDataSource = jsonData.map((item, index) => {
      return {
        ...item,
        key: index
      }
    })
    setDataSource(nextDataSource);
    sheetData[sheetName] = jsonData;
    setColumns(jsonHeader.map(item => {
      return {
        title: item,
        dataIndex: item,
        key: item,
        editable: true,
        onCell: (record) => ({
          record,
          editable: true,
          dataIndex: item,
          title: item,
          handleSave,
        }),
      }
    }))
    setSheetData(sheetData);
  };

  useEffect(() => {
    const nextColumns = columns.map(item => {
      return {
        ...item,
        onCell: (record) => ({
          record,
          editable: true,
          dataIndex: item.dataIndex,
          title: item.dataIndex,
          handleSave,
        }),
      }
    })
    setColumns(nextColumns);
  }, [dataSource])

  function handleAddRow() {
    if (isFilePicked) {
      const nextRow = {...dataSource[dataSource.length - 1]}
      Object.keys(nextRow).forEach(key => {
        nextRow[key] = '';
      })
      nextRow.key = dataSource.length;
      setDataSource([...dataSource, nextRow]);
    }
  }

  return (
    <>
      <div className="App">
        <div className='options'>
          <input type="file" name="file" onChange={changeHandler} />
          <button type="button" onClick={handleAddRow}>Add row</button>
        </div>
        { sheetData.length !== 0 && 
          <Table 
            scroll={{ x: 'max-content', y: true }} 
            dataSource={dataSource} 
            columns={columns} 
            pagination={false} 
            bordered 
            rowClassName={() => 'editable-row'} 
            components={components}
            expandable={{
              defaultExpandAllRows: true
            }}
          />
        }
      </div>
    </>
  )
}

export default App
