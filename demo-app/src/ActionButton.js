import "./App.css"
import loadingImg from "./loading.svg";

function ActionButton({label, loading, clickHandler}) {

  return (
    <button className={loading ? "btn-orange" : ""} onClick={loading ? () => {} : clickHandler}>
      {loading == true ? (
        <img className="loading" src={loadingImg} />
      ) : (
        label
      )}
    </button>
  )
}

export default ActionButton;